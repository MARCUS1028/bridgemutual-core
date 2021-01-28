// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract BMITokenVesting is Ownable {
  using Math for uint256;
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  struct Vesting {
    bool isValid;
    address beneficiary;
    uint256 amount;
    uint256 startDate;
    uint256 periodInMonth;
    uint256 amountPerPeriod;
    uint256 cliffInPeriods;
    uint256 paidAmount;
    bool isCancelable;
  }

  IERC20 public token;
  mapping(uint256 => Vesting) private vestings;
  uint256 public vestingCount;
  uint256 public amountInVestings;

  event TokenSet(IERC20 token);
  event VestingAdded(uint256 vestingId);
  event VestingCanceled(uint256 vestingId);
  event VestingWithdraw(uint256 vestingId, uint256 amount);

  function setToken(IERC20 _token) external onlyOwner {
    require(address(token) == address(0), "token is already set");
    token = _token;
    emit TokenSet(token);
  }

  function createVesting(
    address _beneficiary,
    uint256 _amount,
    uint256 _startDate,
    uint256 _periodInMonth,
    uint256 _amountPerPeriod,
    uint256 _cliffInPeriods,
    bool _isCancelable
  ) external onlyOwner returns (uint256 vestingId) {
    require(getTokensAvailable() >= _amount, "Not enough tokens");

    amountInVestings += _amount;

    vestingId = vestingCount;
    vestings[vestingId] = Vesting({
      isValid: true,
      beneficiary: _beneficiary,
      amount: _amount,
      startDate: _startDate,
      periodInMonth: _periodInMonth,
      amountPerPeriod: _amountPerPeriod,
      cliffInPeriods: _cliffInPeriods,
      paidAmount: 0,
      isCancelable: _isCancelable
    });
    vestingCount += 1;

    emit VestingAdded(vestingId);
  }

  function cancelVesting(uint256 _vestingId) external onlyOwner {
    Vesting storage vesting = vestings[_vestingId];
    require(vesting.isValid, "Vesting doesnt exist or canceled");
    require(vesting.isCancelable, "Vesting is not cancelable");

    vesting.isValid = false;
    uint256 amountReleased = vesting.amount.sub(vesting.paidAmount);
    amountInVestings = amountInVestings.sub(amountReleased);

    emit VestingCanceled(_vestingId);
  }

  function withdrawFromVesting(uint256 _vestingId) external {
    Vesting storage vesting = vestings[_vestingId];
    require(vesting.isValid, "Vesting doesnt exist or canceled");

    uint256 amountToPay = calculateAvailableAmount(vesting).sub(vesting.paidAmount);
    vesting.paidAmount += amountToPay;
    amountInVestings = amountInVestings.sub(amountToPay);
    token.transfer(vesting.beneficiary, amountToPay);

    emit VestingWithdraw(_vestingId, amountToPay);
  }

  function calculateAvailableAmount(Vesting storage _vesting) private view returns (uint256) {
    uint256 elapsedPeriods = calculateElapsedPeriods(_vesting);
    if (elapsedPeriods <= _vesting.cliffInPeriods) return 0;
    uint256 amountAvailable = _vesting.amountPerPeriod.mul(elapsedPeriods);
    return amountAvailable.min(_vesting.amount);
  }

  function calculateElapsedPeriods(Vesting storage _vesting) private view returns (uint256) {
    if (_vesting.startDate > block.timestamp) return 0;
    uint256 periodInSeconds = _vesting.periodInMonth.mul(1 days * 30);
    return block.timestamp.sub(_vesting.startDate).div(periodInSeconds);
  }

  function withdrawExcessiveTokens() external onlyOwner {
    token.transfer(owner(), getTokensAvailable());
  }

  function getTokensAvailable() public view returns (uint256) {
    return token.balanceOf(address(this)).sub(amountInVestings);
  }

  function getVestingById(uint256 _vestingId)
    public
    view
    returns (
      bool isValid,
      address beneficiary,
      uint256 amount,
      uint256 startDate,
      uint256 periodInMonth,
      uint256 amountPerPeriod,
      uint256 cliffInPeriods,
      uint256 paidAmount,
      bool isCancelable
    )
  {
    Vesting storage vesting = vestings[_vestingId];
    isValid = vesting.isValid;
    beneficiary = vesting.beneficiary;
    amount = vesting.amount;
    startDate = vesting.startDate;
    periodInMonth = vesting.periodInMonth;
    amountPerPeriod = vesting.amountPerPeriod;
    cliffInPeriods = vesting.cliffInPeriods;
    paidAmount = vesting.paidAmount;
    isCancelable = vesting.isCancelable;
  }
}
