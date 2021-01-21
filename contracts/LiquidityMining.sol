// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract LiquidityMining {
    using SafeMath for uint256;

    uint256[] public leaderboard;
    uint256 public groupsCount;
    uint256 public startLiquidityMiningTime;

    constructor () {
        groupsCount = 1;
        startLiquidityMiningTime = block.timestamp;
    }

    // ID => Address => InvestedAmount
    mapping (uint256 => mapping (address => uint256)) public groups;

    // ID => total invested amount in the group
    mapping (uint256 => uint256) public totalGroupsAmounts;

    // Address => total invested amount by user
    mapping (address => uint256) public totalInvested;

    event DAIInvested(uint256 _groupID, uint256 _tokensAmount, uint256 _newTotalGroupAmount);
    event LeaderboardUpdated(uint256 _index, uint256 _prevGroupIndex, uint256 _newGroupIndex);

    function getLeaderboard() external view returns (uint256[] memory) {
        return leaderboard;
    }

    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    function investDAI(uint256 _groupID, uint256 _tokensAmount) external {
        uint256 _id = _groupID;
        if (_groupID == 0) {
            _id = groupsCount++;
        }

        uint256 _totalGroupAmount = totalGroupsAmounts[_id].add(_tokensAmount);

        totalGroupsAmounts[_id] = _totalGroupAmount;
        totalInvested[msg.sender] = totalInvested[msg.sender].add(_tokensAmount);
        groups[_id][msg.sender] = groups[_id][msg.sender].add(_tokensAmount);

        _updateLeaderboard(_id);

        emit DAIInvested(_id, _tokensAmount, _totalGroupAmount);
    }

    function distributeNFT() external {}

    function getReward(uint256 _groupID) external returns (uint256) {
        return 0;
    }

    function _checkAvailableReward(uint256 _groupID) public view returns (bool) {
        return true;
    }

    function _updateLeaderboard(uint256 _groupID) internal returns (bool) {
        uint256 _leaderBoardLength = leaderboard.length;
        uint256 _maxLength = 10;

        if(_leaderBoardLength == 0) {
            leaderboard.push(_groupID);
            emit LeaderboardUpdated(0, 0, _groupID);
            return true;
        }

        uint256 _currentGroupIndex = _maxLength;
        uint256 _foundedLessIndex = _maxLength;
        for (uint256 i = 0; i < _leaderBoardLength; i++) {
            if (totalGroupsAmounts[_groupID] > totalGroupsAmounts[leaderboard[i]]) {
                _foundedLessIndex = i;
                break;
            }
        }

        for (uint256 i = 0; i < _leaderBoardLength; i++) {
            if (_groupID == leaderboard[i]) {
                _currentGroupIndex = i;
                break;
            }
        }

        if(_currentGroupIndex == _maxLength) {
            _currentGroupIndex = leaderboard.length;
            leaderboard.push(_groupID);
        }

        if(_currentGroupIndex < _foundedLessIndex) {
            return true;
        }

        uint256 _prevID = leaderboard[_foundedLessIndex];
        uint256 _tmpID;
        uint256 _currentID = _groupID;
        for (uint256 i = _foundedLessIndex; i <= _currentGroupIndex; i++) {
            _tmpID = leaderboard[i];
            leaderboard[i] = _currentID;
            _currentID = _tmpID;
        }

        if(leaderboard.length == _maxLength.add(1)) {
            leaderboard.pop();
        }

        emit LeaderboardUpdated(_foundedLessIndex, _prevID, _groupID);
        return true;
    }
}
