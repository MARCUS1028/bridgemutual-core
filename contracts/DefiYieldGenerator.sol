// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./ContractsRegistry.sol";

contract DefiYieldGenerator is Ownable {
    uint256 constant private MAX_INT = 2**256 - 1;

    ContractsRegistry public contractsRegistry;

    IERC20 public daiToken;
    IERC20 public bmiToken;
    address public bmiDaiStakingAddress;

    modifier onlyStaking() {
        require (msg.sender == bmiDaiStakingAddress, "DefiYieldGenerator: caller is not a staking");
        _;
    }

    function initRegistry(ContractsRegistry _contractsRegistry) external onlyOwner {
        contractsRegistry = _contractsRegistry;
        
        daiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getDAIName()));
        bmiToken = IERC20(_contractsRegistry.getContract(_contractsRegistry.getBMIName()));
        bmiDaiStakingAddress = _contractsRegistry.getContract(_contractsRegistry.getBmiDAIStakingName());
    }

    function approveAllDaiTokensForStakingWithdrowal() external onlyOwner {
        bool success = daiToken.approve(bmiDaiStakingAddress, MAX_INT);

        require(success, "Failed to approve DAI tokens");
    }

    function approveAllBMITokensForStakingWithdrowal() external onlyOwner {
        bool success = bmiToken.approve(bmiDaiStakingAddress, MAX_INT);

        require(success, "Failed to approve BMI tokens");
    }
    
// TODO
    function getProfit(uint256 stakingStartTime, uint256 stakedDAIAmount) external onlyStaking returns (uint256) {        
        return 0;
    }
}