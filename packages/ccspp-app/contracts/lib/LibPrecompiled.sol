pragma solidity ^0.5.7;


/// @title LibPrecompiled - A wrapper around precomplied contracts for EC op
/// @notice This contract try to abstract away calling of precompiled native
///         contract to make using EC operations on BN_256 curve easier
contract LibPrecompiled {

  // details see: https://cryptojedi.org/papers/dclxvi-20100714.pdf
  uint public curveGenX = 0x1;
  uint public curveGenY =
  0x8fb501e34aa387f9aa6fecb86184dc21ee5b88d120b5b59e185cac6c5e089665;
  // courtesy of https://medium.com/@rbkhmrcr/precompiles-solidity-e5d29bd428c4
  function scalarMult(uint x, uint y, uint scalar)
    public
    view
    returns (uint[2] memory output)
  {
    uint[3] memory input;
    input[0] = x;
    input[1] = y;
    input[2] = scalar;

    // assembly {
    //   output := staticcall(gas, 0x07, input, 0x60, output, 0x40)
    // }
    assembly {
      if iszero(staticcall(not(0), 0x07, input, 0x60, output, 0x40)) {
        revert(0, 0)
      }
    }
  }

  /// @notice scalarMultiplication with the generator, usually used in KeyGen
  function scalarBaseMult(uint scalar)
    public
    view
    returns (uint[2] memory output)
  {
    return scalarMult(curveGenX, curveGenY, scalar);
  }
}
