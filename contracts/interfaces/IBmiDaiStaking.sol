// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "./IPolicyBook.sol";

interface IBmiDaiStaking {
    struct StakingInfo {
        uint256 stakingStartTime;        
        uint256 stakedDaiAmount;
        address policyBookAddress;
    }   

    function stakeDAIx(uint256 _amount, IPolicyBook _policyBook) external;

    function withdrawBMIProfit(uint256 tokenID) external;
        
    function withdrawFundsWithProfit(uint256 tokenID) external;

    function getStakingInfoByTokenID(uint256 tokenID) external view returns (IBmiDaiStaking.StakingInfo memory _stakingInfo);
}