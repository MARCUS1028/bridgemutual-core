// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import "./interfaces/IPolicyBook.sol";

contract PolicyBook {
    uint256 public constant DAYS_IN_THE_YEAR = 365;
    uint256 public constant PERSENTAGE_MULTIPLIER = 10**10;
    uint256 public constant PERSENTAGE_100 = 100 * PERSENTAGE_MULTIPLIER;

    uint256 public constant DAI_IN_THE_POOL_TOTAL = 10000000; // 10 mil
    uint256 public constant DAI_IN_THE_POOL_BOUGHT = 5000000; // 5 mil

    uint256 public constant MINIMUM_COST_PERSENTAGE = 5 * PERSENTAGE_MULTIPLIER;

    uint256 public constant RISKY_ASSET_TRESHOLD_PERSENTAGE = 70 * PERSENTAGE_MULTIPLIER;
    uint256 public constant MAXIMUM_COST_NOT_RISKY_PERSENTAGE = 30 * PERSENTAGE_MULTIPLIER;
    uint256 public constant MAXIMUM_COST_100_UTILIZATION_PERSENTAGE = 150 * PERSENTAGE_MULTIPLIER;

    /// @notice Call only when utilizationRatio < RISKY_ASSET_TRESHOLD
    function calculateWhenNotRisky(uint256 _utilizationRatioPersentage)
        internal
        pure
        returns (uint256 _persentage)
    {
        return
            _utilizationRatioPersentage * MAXIMUM_COST_NOT_RISKY_PERSENTAGE /
            RISKY_ASSET_TRESHOLD_PERSENTAGE;
    }

    /// @notice Call only when utilizationRatio >= RISKY_ASSET_TRESHOLD
    function calculateWhenIsRisky(uint256 _utilizationRatioPersentage)
        internal
        pure
        returns (uint256 _persentage)
    {
        uint256 riskyRelation =
            (_utilizationRatioPersentage - RISKY_ASSET_TRESHOLD_PERSENTAGE) /
                (PERSENTAGE_100 - RISKY_ASSET_TRESHOLD_PERSENTAGE);

        return
            MAXIMUM_COST_NOT_RISKY_PERSENTAGE +
            riskyRelation * (MAXIMUM_COST_100_UTILIZATION_PERSENTAGE - MAXIMUM_COST_NOT_RISKY_PERSENTAGE);
    }

    /// @notice Let user to calculate policy cost in DAI, access: ANY
    /// @param _durationDays is number of days to cover
    /// @param _tokens is number of tokens to cover
    /// @return _daiTokens is amount of DAI policy costs
    function getQuote(uint256 _durationDays, uint256 _tokens)
        external
        view
        returns (uint256 _daiTokens)
    {
        uint256 utilizationRatioPersentage =
            (DAI_IN_THE_POOL_BOUGHT + _tokens) * PERSENTAGE_100 / DAI_IN_THE_POOL_TOTAL;

        uint256 annualInsuranceCostPersentage;

        if (utilizationRatioPersentage < RISKY_ASSET_TRESHOLD_PERSENTAGE) {
            annualInsuranceCostPersentage = calculateWhenNotRisky(utilizationRatioPersentage);
        } else {
            annualInsuranceCostPersentage = calculateWhenIsRisky(utilizationRatioPersentage);
        }

        annualInsuranceCostPersentage = (
            annualInsuranceCostPersentage > MINIMUM_COST_PERSENTAGE
                ? annualInsuranceCostPersentage
                : MINIMUM_COST_PERSENTAGE
        );
        
        uint256 actualInsuranceCostPersentage = 
            _durationDays * annualInsuranceCostPersentage / DAYS_IN_THE_YEAR;

        return _tokens * actualInsuranceCostPersentage / PERSENTAGE_100;
    }
}
