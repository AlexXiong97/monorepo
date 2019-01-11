import * as waffle from "ethereum-waffle";
import { Contract, ethers } from "ethers";
import { HashZero } from "ethers/constants";

import ExampleCondition from "../build/ExampleCondition.json";
import LibCondition from "../build/LibCondition.json";
import LibStaticCall from "../build/LibStaticCall.json";

import { expect } from "./utils";

const { keccak256, defaultAbiCoder, solidityKeccak256 } = ethers.utils;

describe("LibCondition", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let exampleCondition: Contract;
  let libCondition: Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);
    waffle.link(
      LibCondition,
      "contracts/libs/LibStaticCall.sol:LibStaticCall",
      libStaticCall.address
    );

    libCondition = await waffle.deployContract(wallet, LibCondition);
    exampleCondition = await waffle.deployContract(wallet, ExampleCondition);
  });

  describe("asserts conditions with no params", () => {
    const makeCondition = (
      expectedValue: string,
      onlyCheckForSuccess: boolean
    ) => ({
      onlyCheckForSuccess,
      expectedValueHash: keccak256(expectedValue),
      parameters: HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(HashZero, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(HashZero, false);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
    });
  });

  describe("asserts conditions with params", () => {
    const makeCondition = (
      expectedValue: string,
      parameters: string,
      onlyCheckForSuccess: boolean
    ) => ({
      onlyCheckForSuccess,
      parameters,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
    });

    const trueParam = defaultAbiCoder.encode(["tuple(bool)"], [[true]]);

    const falseParam = defaultAbiCoder.encode(["tuple(bool)"], [[false]]);

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(HashZero, trueParam, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function did not fail but returned false", async () => {
      const condition = makeCondition(HashZero, falseParam, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        trueParam,
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        falseParam,
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
    });
  });
});
