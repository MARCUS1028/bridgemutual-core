// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IBmiDaiStaking.sol";

import "./ContractsRegistry.sol";

contract DefiYieldGenerator is Ownable {
    uint256 constant private MAX_INT = 2**256 - 1;

    ContractsRegistry public contractsRegistry;

    IERC20 public daiToken;
    IERC20 public bmiToken;
    IBmiDaiStaking public bmiDaiStaking;

    function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
        contractsRegistry = _contractsRegistry;
        
        daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
        bmiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getBMIName()));
        bmiDaiStaking = IBmiDaiStaking(_contractsRegistry.getContract(_contractsRegistry.getBmiDAIStakingName()));
    }

    function approveAllDaiTokensForStakingWithdrowal() external onlyOwner {
        bool success = daiToken.approve(address(bmiDaiStaking), MAX_INT);

        require(success, "Failed to approve DAI tokens");
    }

    function approveAllBMITokensForStakingWithdrowal() external onlyOwner {
        bool success = bmiToken.approve(address(bmiDaiStaking), MAX_INT);

        require(success, "Failed to approve BMI tokens");
    }
    
// TODO
    function updateProfitBMITokensFor(uint256 tokenID) external {
        // Add bmi tokens to this address, then =>

        IBmiDaiStaking.StakingInfo memory stakingInfo = bmiDaiStaking.getStakingInfoByTokenID(tokenID);

        bmiDaiStaking.increaseBmiProfit(tokenID, generateProfit(stakingInfo));
    }

// TODO
    function generateProfit(IBmiDaiStaking.StakingInfo memory stakingInfo) private pure returns (uint256) {        
        return 0;
    }
}