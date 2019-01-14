import { NetworkContext } from "@counterfactual/types";

import { MiddlewareContainer } from "./middleware";
import { StateChannel } from "./models";
import { Opcode } from "./opcodes";
import { getProtocolFromName } from "./protocol";
import {
  InstallParams,
  InstallVirtualAppParams,
  ProtocolMessage,
  SetupParams,
  UninstallParams,
  UpdateParams
} from "./protocol-types-tbd";
import { Context, Instruction, Middleware, Protocol } from "./types";

export class InstructionExecutor {
  public middlewares: MiddlewareContainer;

  constructor(public readonly network: NetworkContext) {
    this.middlewares = new MiddlewareContainer();
  }

  public register(scope: Opcode, method: Middleware) {
    this.middlewares.add(scope, method);
  }

  public async dispatchReceivedMessage(
    msg: ProtocolMessage,
    sc: Map<string, StateChannel>
  ) {
    const protocol = getProtocolFromName(msg.protocol);
    const step = protocol[msg.seq];
    if (step === undefined) {
      throw Error(
        `Received invalid seq ${msg.seq} for protocol ${msg.protocol}`
      );
    }
    return this.runProtocol(sc, step, msg);
  }

  public async runUpdateProtocol(sc: StateChannel, params: UpdateParams) {
    const protocol = Protocol.Update;
    return this.runProtocol(
      new Map<string, StateChannel>([[sc.multisigAddress, sc]]),
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        seq: 0,
        fromAddress: params.initiatingAddress,
        toAddress: params.respondingAddress
      }
    );
  }

  public async runUninstallProtocol(sc: StateChannel, params: UninstallParams) {
    const protocol = Protocol.Uninstall;
    return this.runProtocol(
      new Map<string, StateChannel>([[sc.multisigAddress, sc]]),
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        seq: 0,
        fromAddress: params.initiatingAddress,
        toAddress: params.respondingAddress
      }
    );
  }

  public async runInstallProtocol(sc: StateChannel, params: InstallParams) {
    const protocol = Protocol.Install;
    return this.runProtocol(
      new Map<string, StateChannel>([[sc.multisigAddress, sc]]),
      getProtocolFromName(protocol)[0],
      {
        params,
        protocol,
        seq: 0,
        fromAddress: params.initiatingAddress,
        toAddress: params.respondingAddress
      }
    );
  }

  public async runSetupProtocol(sc: StateChannel, params: SetupParams) {
    const protocol = Protocol.Setup;
    return this.runProtocol(
      new Map<string, StateChannel>([[sc.multisigAddress, sc]]),
      getProtocolFromName(protocol)[0],
      {
        protocol,
        params,
        seq: 0,
        fromAddress: params.initiatingAddress,
        toAddress: params.respondingAddress
      }
    );
  }

  public async runInstallVirtualAppProtocol(
    scm: Map<string, StateChannel>,
    params: InstallVirtualAppParams
  ) {
    const protocol = Protocol.InstallVirtualApp;
    return this.runProtocol(scm, getProtocolFromName(protocol)[0], {
      params,
      protocol,
      seq: 0,
      fromAddress: params.initiatingAddress,
      toAddress: params.intermediaryAddress
    });
  }

  private async runProtocol(
    scm: Map<string, StateChannel>,
    instructions: Instruction[],
    msg: ProtocolMessage
  ): Promise<Map<string, StateChannel>> {
    const context: Context = {
      network: this.network,
      outbox: [],
      inbox: [],
      stateChannelsMap: scm,
      commitment: undefined,
      signature: undefined
    };

    let instructionPointer = 0;

    while (instructionPointer < instructions.length) {
      const instruction = instructions[instructionPointer];
      try {
        if (typeof instruction === "function") {
          instruction.call(null, msg, context);
        } else {
          await this.middlewares.run(msg, instruction, context);
        }
        instructionPointer += 1;
      } catch (e) {
        throw Error(
          `While executing op number ${instructionPointer} at seq ${
            msg.seq
          } of protocol ${
            msg.protocol
          }, execution failed with the following error. ${e.stack}`
        );
      }
    }

    if (context.stateChannelsMap === undefined) {
      throw Error(
        `After protocol ${
          msg.protocol
        } executed, expected context.stateChannel to be set, but it is undefined`
      );
    }

    // TODO: it is possible to compute a diff of the original state channel
    //       object and the computed new state channel object at this point
    //       probably useful!
    //
    // const diff = sc.diff(context.stateChannel)

    return context.stateChannelsMap;
  }
}
