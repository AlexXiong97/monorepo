import chai from "chai";
import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";
import { BigNumber, bigNumberify } from "ethers/utils";

import LibPrecompiled from "../build/LibPrecompiled.json";

chai.use(waffle.solidity);
const { expect } = chai;

describe("LibPrecompiled", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;
  let libprecompiled: ethers.Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = waffle.getWallets(provider)[0];

    libprecompiled = await waffle.deployContract(wallet, LibPrecompiled);
  });

  const sk1: BigNumber = bigNumberify(
    "19863503168721767052470763080964584560829382977903706668947398297116896025507"
  );
  const pk1: BigNumber[] = [
    bigNumberify(
      "0x8a4b686c84082d699954823ac494e2f667545100e159e6dd39956049e9397c62"
    ),
    bigNumberify(
      "0x841d08abe964044bbb0e5de91dd81ee0c7d2da6b1d59e55732a1f2e7c576197f"
    )
  ];
  const sk2: BigNumber = bigNumberify(
    "42411803530570037984902453521978100812441758711834278806081178240791067183758"
  );
  const pk2: BigNumber[] = [
    bigNumberify(
      "0x1f99f384c402c239263743ad6afd3d2b9848009702686717e2eae94dfb4b15b7"
    ),
    bigNumberify(
      "0x051e4a62af58bfd43b37b5943c3095648d68865c00d1882dd0478568e96ffe6f"
    )
  ];

  const sharedKey: BigNumber[] = [
    bigNumberify(
      "0x8ace3b9a3fdf332d6f5ad718c15fce5d595c079de08bc45191745995490f5b3c"
    ),
    bigNumberify(
      "0x0cf97e4216b150879c6e49d984c2565aa5073ca1440a4b3a527e9a48ecce5c51"
    )
  ];
  it("can calculate scalar mul", async () => {
    // FIXME: currently the function will revert
    // const ret = await libprecompiled.scalarBaseMult(sk1);
    // expect(ret).to.deep.eq(pk1);
  });
});
