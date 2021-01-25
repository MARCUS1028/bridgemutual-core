// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "./LiquidityMiningNFT.sol";

contract LiquidityMining is ERC1155Receiver {
    using SafeMath for uint256;

    uint256[] public leaderboard;
    uint256 public groupsCount;
    uint256 public startLiquidityMiningTime;
    uint256 public maxGroupLeadersSize = 11;
    uint256 public maxLeaderboardSize = 10;
    uint256 public maxMonthToGetReward = 5;
    uint256 public decimal = 10**27;

    IERC20 bmiToken;
    LiquidityMiningNFT nft;

    struct RewardInfo {
        uint256 countOfMonth;
        uint256 lastUpdate;
    }

    constructor (IERC20 _bmiToken, LiquidityMiningNFT _nft) {
        groupsCount = 1;
        startLiquidityMiningTime = block.timestamp;
        bmiToken = _bmiToken;
        nft = _nft;
    }

    // ID => Address => InvestedAmount
    mapping (uint256 => mapping (address => uint256)) public groups;

    // ID => total invested amount in the group
    mapping (uint256 => uint256) public totalGroupsAmount;

    // ID => Address => info
    mapping (uint256 => mapping (address => RewardInfo)) public rewardInfos;

    // ID => Leaders accounts addresses
    mapping (uint256 => address[]) public groupsLeaders;

    event DAIInvested(uint256 _groupID, uint256 _tokensAmount, uint256 _newTotalGroupAmount);
    event LeaderboardUpdated(uint256 _index, uint256 _prevGroupIndex, uint256 _newGroupIndex);
    event RewardInfoUpdated(uint256 _groupID, address _address, uint256 _newCountOfMonth, uint256 _newLastUpdate);
    event RewardSended(uint256 _groupID, address _address, uint256 _reward);
    event NFTSended(address _address, uint256 _nftIndex);

    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    function investDAI(uint256 _groupID, uint256 _tokensAmount) external {
        uint256 _id = _groupID;
        if (_groupID == 0) {
            _id = groupsCount++;
        }

        uint256 _totalGroupAmount = totalGroupsAmount[_id].add(_tokensAmount);

        totalGroupsAmount[_id] = _totalGroupAmount;
        groups[_id][msg.sender] = groups[_id][msg.sender].add(_tokensAmount);

        _updateLeaderboard(_id);
        _updateGroupLeaders(_id);

        emit DAIInvested(_id, _tokensAmount, _totalGroupAmount);
    }

    function distributeAllNFT() external {
        uint256 _tmpGroupId;
        for(uint256 i = 0; i < leaderboard.length; i++) {
            _tmpGroupId = leaderboard[i];
            if(groups[_tmpGroupId][msg.sender] > 0) {
                distributeNFT(_tmpGroupId);
            }
        }
    }

    function distributeNFT(uint256 _groupID) public returns (bool){
        require(block.timestamp > startLiquidityMiningTime.add(2 weeks),
            "2 weeks after liquidity mining time has not expire");

        if (_getIndexInTheLeaderboard(_groupID) == maxLeaderboardSize) {
            return false;
        }

        uint256 _foundedIndex = maxGroupLeadersSize;
        address[] memory _addresses = groupsLeaders[_groupID];

        for (uint256 i = 0; i < _addresses.length; i++) {
            if (_addresses[i] == msg.sender) {
                _foundedIndex = i;
                break;
            }
        }

        if (_foundedIndex == maxGroupLeadersSize) {
            return false;
        }

        _sendNFT(_foundedIndex);

        return true;
    }

    function getTotalReward() external returns (uint256) {
        uint256 _totalReward;
        uint256 _tmpGroupId;
        for(uint256 i = 0; i < leaderboard.length; i++) {
            _tmpGroupId = leaderboard[i];
            if(groups[_tmpGroupId][msg.sender] > 0) {
                _totalReward = _totalReward.add(getRewardFromGroup(_tmpGroupId));
            }
        }

        return _totalReward;
    }

    function getRewardFromGroup(uint256 _groupID) public returns (uint256) {
        require(block.timestamp > startLiquidityMiningTime.add(2 weeks),
            "2 weeks after liquidity mining time has not expire");
        
        if(!checkAvailableReward(_groupID)) {
            return 0;
        }

        uint256 _rewardPerMonth = _getRewardPerMonth(_groupID);
        RewardInfo memory _rewardInfo = rewardInfos[_groupID][msg.sender];

        uint256 _totalReward = _rewardPerMonth.mul(_rewardInfo.countOfMonth);
        uint256 _userRewardPer = _calculatePercentage(groups[_groupID][msg.sender], totalGroupsAmount[_groupID]);
        uint256 _userReward = _totalReward.mul(_userRewardPer).div(decimal);

        require(bmiToken.transfer(msg.sender, _userReward), "Failed to transfer tokens");
        emit RewardSended(_groupID, msg.sender, _userReward);

        _rewardInfo.countOfMonth = 0;
        _rewardInfo.lastUpdate = block.timestamp;

        rewardInfos[_groupID][msg.sender] = _rewardInfo;

        return _userReward;
    }

    function checkAvailableReward(uint256 _groupID) public returns (bool) {
        uint256 _currentGroupIndex = _getIndexInTheLeaderboard(_groupID);
        if(_currentGroupIndex == maxLeaderboardSize) {
            return false;
        }

        if(groups[_groupID][msg.sender] == 0) {
            return false;
        }

        _updateRewardInfo(_groupID);

        if (rewardInfos[_groupID][msg.sender].countOfMonth == 0) {
            return false;
        }

        return true;
    }

    function _sendNFT(uint256 _index) internal {
        uint256 _nftIndex;

        if (_index == 0) {
            _nftIndex = 1;
        } else if (_index > 0 && _index < 3) {
            _nftIndex = 2;
        } else if (_index >= 3 && _index < 6) {
            _nftIndex = 3;
        } else {
            _nftIndex = 4;
        }
        nft.safeTransferFrom(address(this), msg.sender, _nftIndex, 1, "");

        emit NFTSended(msg.sender, _nftIndex);
    }

    function _calculatePercentage(uint256 _part, uint256 _amount) internal view returns (uint256) {
        if (_amount == 0) {
            return 0;
        }
        return _part.mul(decimal).div(_amount);
    }

    function _getRewardPerMonth(uint256 _groupID) internal view returns (uint256) {
        uint256 _indexInTheLeaderboard = _getIndexInTheLeaderboard(_groupID);
        uint256 _rewardPerMonth;

        if(_indexInTheLeaderboard == 0) {
            _rewardPerMonth = 50000;
        } else if (_indexInTheLeaderboard > 0 && _indexInTheLeaderboard < 5) {
            _rewardPerMonth = 10000;
        } else {
            _rewardPerMonth = 4000;
        }

        return _rewardPerMonth;
    }

    function _updateRewardInfo(uint256 _groupID) internal {
        RewardInfo memory _rewardInfo = rewardInfos[_groupID][msg.sender];
        uint256 _oneMonth = 30 days;
        uint256 _startRewardTime = startLiquidityMiningTime.add(2 weeks);

        uint256 _countOfRewardedMonth;
        for(uint256 i = 0; i < maxMonthToGetReward; i++) {
            if(_rewardInfo.lastUpdate > _startRewardTime.add(_oneMonth.mul(i))) {
                _countOfRewardedMonth++;
            }
        }

        if (_countOfRewardedMonth != maxMonthToGetReward) {
            for(uint256 i = _countOfRewardedMonth; i < maxMonthToGetReward; i++) {
                if(block.timestamp > _startRewardTime.add(_oneMonth.mul(i))) {
                    _rewardInfo.countOfMonth++;
                }
            }

            _rewardInfo.lastUpdate = block.timestamp;

            rewardInfos[_groupID][msg.sender] = _rewardInfo;
            emit RewardInfoUpdated(_groupID, msg.sender, _rewardInfo.countOfMonth, _rewardInfo.lastUpdate);
        }
    }

    function _getIndexInTheLeaderboard(uint256 _groupID) internal view returns (uint256) {
        uint256 _leaderBoardLength = leaderboard.length;

        uint256 _foundedIndex = maxLeaderboardSize;
        for(uint256 i = 0; i < _leaderBoardLength; i++) {
            if(_groupID == leaderboard[i]) {
                _foundedIndex = i;
            }
        }

        return _foundedIndex;
    }

    function _updateLeaderboard(uint256 _groupID) internal returns (bool) {
        uint256 _leaderBoardLength = leaderboard.length;

        if(_leaderBoardLength == 0) {
            leaderboard.push(_groupID);
            emit LeaderboardUpdated(0, 0, _groupID);
            return true;
        }

        uint256 _currentGroupIndex = _getIndexInTheLeaderboard(_groupID);
        uint256 _foundedLessIndex = maxLeaderboardSize;

        for (uint256 i = 0; i < _leaderBoardLength; i++) {
            if (totalGroupsAmount[_groupID] > totalGroupsAmount[leaderboard[i]]) {
                _foundedLessIndex = i;
                break;
            }
        }

        if(_currentGroupIndex == maxLeaderboardSize) {
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

        if(leaderboard.length == maxLeaderboardSize.add(1)) {
            leaderboard.pop();
        }

        emit LeaderboardUpdated(_foundedLessIndex, _prevID, _groupID);
        return true;
    }

    function _updateGroupLeaders(uint256 _groupID) internal returns (bool) {
        address[] memory _addresses = groupsLeaders[_groupID];
        uint256 _groupLeadersSize = _addresses.length;

        if(_groupLeadersSize == 0) {
            groupsLeaders[_groupID].push(msg.sender);
            return true;
        }

        uint256 _currentIndex = maxGroupLeadersSize;
        uint256 _foundedLessIndex = maxGroupLeadersSize;

        for (uint256 i = 0; i < _groupLeadersSize; i++) {
            if (_addresses[i] == msg.sender) {
                _currentIndex = i;
                break;
            }
        }

        for (uint256 i = 0; i < _groupLeadersSize; i++) {
            if (groups[_groupID][msg.sender] > groups[_groupID][_addresses[i]]) {
                _foundedLessIndex = i;
                break;
            }
        }

        if(_currentIndex == maxGroupLeadersSize) {
            _currentIndex = _groupLeadersSize;
            groupsLeaders[_groupID].push(msg.sender);
        }

        if(_currentIndex < _foundedLessIndex) {
            return true;
        }

        _addresses = groupsLeaders[_groupID];

        address _tmpAddr;
        address _currentAddr = msg.sender;
        for (uint256 i = _foundedLessIndex; i <= _currentIndex; i++) {
            _tmpAddr = _addresses[i];
            _addresses[i] = _currentAddr;
            _currentAddr = _tmpAddr;
        }

        groupsLeaders[_groupID] = _addresses;

        if(_addresses.length == maxGroupLeadersSize.add(1)) {
            groupsLeaders[_groupID].pop();
        }
        return true;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    )
        external
        override
        returns(bytes4)
    {
        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    )
        external
        override
        returns(bytes4)
    {
        return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
    }
}
