import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, HashZero, WeiPerEther, Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  defaultAbiCoder,
  hexlify,
  randomBytes,
  solidityKeccak256
} from "ethers/utils";

import ConditionalTransaction from "../build/ConditionalTransaction.json";
import DelegateProxy from "../build/DelegateProxy.json";
import ExampleCondition from "../build/ExampleCondition.json";
import LibStaticCall from "../build/LibStaticCall.json";
import Transfer from "../build/Transfer.json";

import { expect } from "./utils";

describe("ConditionalTransaction", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let exampleCondition: Contract;
  let delegateProxy: Contract;
  let conditionalTransaction: Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const transfer = await waffle.deployContract(wallet, Transfer);
    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);

    waffle.link(
      ConditionalTransaction,
      "contracts/libs/Transfer.sol:Transfer",
      transfer.address
    );

    waffle.link(
      ConditionalTransaction,
      "contracts/libs/LibStaticCall.sol:LibStaticCall",
      libStaticCall.address
    );

    conditionalTransaction = await waffle.deployContract(
      wallet,
      ConditionalTransaction
    );
    exampleCondition = await waffle.deployContract(wallet, ExampleCondition);
    delegateProxy = await waffle.deployContract(wallet, DelegateProxy);
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (
      expectedValue: string,
      onlyCheckForSuccess: boolean
    ) => ({
      onlyCheckForSuccess,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      parameters: HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    const makeConditionParam = (expectedValue: string, parameters: string) => ({
      parameters,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      onlyCheckForSuccess: false,
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
    });

    const trueParam = defaultAbiCoder.encode(["tuple(bool)"], [[true]]);

    const falseParam = defaultAbiCoder.encode(["tuple(bool)"], [[false]]);

    beforeEach(async () => {
      await wallet.sendTransaction({
        to: delegateProxy.address,
        value: WeiPerEther
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = hexlify(randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeCondition(HashZero, true),
          {
            value: [WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: AddressZero,
            data: []
          }
        ]
      );

      await delegateProxy.functions.delegate(
        conditionalTransaction.address,
        tx,
        {
          gasLimit: 600000
        }
      );

      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(WeiPerEther);

      const emptyBalance = Zero;
      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(emptyBalance);
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = hexlify(randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            value: [WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: AddressZero,
            data: []
          }
        ]
      );

      await expect(
        delegateProxy.functions.delegate(conditionalTransaction.address, tx, {
          gasLimit: 60000
        })
        // @ts-ignore
      ).to.be.reverted;

      const emptyBalance = Zero;
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(emptyBalance);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(WeiPerEther);
    });
  });
});
