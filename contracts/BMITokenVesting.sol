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

  enum VestingSchedule {
    ANGELROUND,
    SEEDROUND,
    PRIVATEROUND,
    LISTINGS,
    LIQUIDITYMINING,
    GROWTH,
    OPERATIONAL,
    FOUNDERS,
    DEVELOPERS,
    ADVISORS,
    BUGFINDING,
    VAULT
  }

  struct Vesting {
    bool isValid;
    address beneficiary;
    uint256 amount;
    VestingSchedule vestingSchedule;
    uint256 paidAmount;
    bool isCancelable;
  }

  struct LinearVestingSchedule {
    uint256 portionOfTotal;
    uint256 startDate;
    uint256 periodInMonth;
    uint256 portionPerPeriod;
    uint256 cliffInPeriods;
  }

  uint256 public constant SECONDS_IN_MONTH = 60 * 60 * 24 * 30;
  uint256 public constant PORTION_OF_TOTAL_PRECISION = 100;
  uint256 public constant PORTION_PER_PERIOD_PRECISION = 10**4;

  IERC20 public token;
  Vesting[] public vestings;
  uint256 public amountInVestings;
  uint256 public tgeTimestamp;
  mapping(VestingSchedule => LinearVestingSchedule[]) public vestingSchedules;

  event TokenSet(IERC20 token);
  event VestingAdded(uint256 vestingId, address beneficiary);
  event VestingCanceled(uint256 vestingId);
  event VestingWithdraw(uint256 vestingId, uint256 amount);

  constructor(uint256 _tgeTimestamp) {
    tgeTimestamp = _tgeTimestamp;

    initializeVestingSchedules();
  }

  function initializeVestingSchedules() internal {
    addLinearVestingSchedule(
      VestingSchedule.ANGELROUND,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(4),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.SEEDROUND,
      LinearVestingSchedule({
        portionOfTotal: 50,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH.mul(2)),
        periodInMonth: 2,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(2),
        cliffInPeriods: 0
      })
    );
    addLinearVestingSchedule(
      VestingSchedule.SEEDROUND,
      LinearVestingSchedule({
        portionOfTotal: 50,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION,
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.PRIVATEROUND,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(4),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.LISTINGS,
      LinearVestingSchedule({
        portionOfTotal: 60,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION,
        cliffInPeriods: 0
      })
    );
    addLinearVestingSchedule(
      VestingSchedule.LISTINGS,
      LinearVestingSchedule({
        portionOfTotal: 40,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION,
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.LIQUIDITYMINING,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(10),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.GROWTH,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp.add(SECONDS_IN_MONTH.mul(2)),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(100).mul(5),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.OPERATIONAL,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(100).mul(5),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.FOUNDERS,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(100).mul(4),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.DEVELOPERS,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(100).mul(4),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.ADVISORS,
      LinearVestingSchedule({
        portionOfTotal: 48,
        startDate: tgeTimestamp.sub(SECONDS_IN_MONTH),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(4),
        cliffInPeriods: 0
      })
    );
    addLinearVestingSchedule(
      VestingSchedule.ADVISORS,
      LinearVestingSchedule({
        portionOfTotal: 52,
        startDate: tgeTimestamp.add(SECONDS_IN_MONTH.mul(3)),
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(6),
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.BUGFINDING,
      LinearVestingSchedule({
        portionOfTotal: 50,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION,
        cliffInPeriods: 0
      })
    );
    addLinearVestingSchedule(
      VestingSchedule.BUGFINDING,
      LinearVestingSchedule({
        portionOfTotal: 50,
        startDate: tgeTimestamp,
        periodInMonth: 3,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION,
        cliffInPeriods: 0
      })
    );

    addLinearVestingSchedule(
      VestingSchedule.VAULT,
      LinearVestingSchedule({
        portionOfTotal: 100,
        startDate: tgeTimestamp,
        periodInMonth: 1,
        portionPerPeriod: PORTION_PER_PERIOD_PRECISION.div(100).mul(5),
        cliffInPeriods: 0
      })
    );
  }

  function addLinearVestingSchedule(VestingSchedule _type, LinearVestingSchedule memory _schedule) internal {
    vestingSchedules[_type].push(_schedule);
  }

  function setToken(IERC20 _token) external onlyOwner {
    require(address(token) == address(0), "token is already set");
    token = _token;
    emit TokenSet(token);
  }

  function createVestingBulk(
    address[] calldata _beneficiary,
    uint256[] calldata _amount,
    VestingSchedule[] calldata _vestingSchedule,
    bool[] calldata _isCancelable
  ) external onlyOwner {
    require(
      _beneficiary.length == _amount.length &&
        _beneficiary.length == _vestingSchedule.length &&
        _beneficiary.length == _isCancelable.length,
      "Parameters length mismatch"
    );

    for (uint256 i = 0; i < _beneficiary.length; i++) {
      _createVesting(_beneficiary[i], _amount[i], _vestingSchedule[i], _isCancelable[i]);
    }
  }

  function createVesting(
    address _beneficiary,
    uint256 _amount,
    VestingSchedule _vestingSchedule,
    bool _isCancelable
  ) external onlyOwner returns (uint256 vestingId) {
    return _createVesting(_beneficiary, _amount, _vestingSchedule, _isCancelable);
  }

  function _createVesting(
    address _beneficiary,
    uint256 _amount,
    VestingSchedule _vestingSchedule,
    bool _isCancelable
  ) internal returns (uint256 vestingId) {
    require(getTokensAvailable() >= _amount, "Not enough tokens");

    amountInVestings += _amount;

    vestingId = vestings.length;
    vestings.push(
      Vesting({
        isValid: true,
        beneficiary: _beneficiary,
        amount: _amount,
        vestingSchedule: _vestingSchedule,
        paidAmount: 0,
        isCancelable: _isCancelable
      })
    );

    emit VestingAdded(vestingId, _beneficiary);
  }

  function cancelVesting(uint256 _vestingId) external onlyOwner {
    Vesting storage vesting = getVesting(_vestingId);
    require(vesting.isValid, "Vesting is canceled");
    require(vesting.isCancelable, "Vesting is not cancelable");

    vesting.isValid = false;
    uint256 amountReleased = vesting.amount.sub(vesting.paidAmount);
    amountInVestings = amountInVestings.sub(amountReleased);

    emit VestingCanceled(_vestingId);
  }

  function withdrawFromVesting(uint256 _vestingId) external {
    Vesting storage vesting = getVesting(_vestingId);
    require(vesting.isValid, "Vesting is canceled");

    uint256 amountToPay = _getWithdrawableAmount(vesting);
    vesting.paidAmount += amountToPay;
    amountInVestings = amountInVestings.sub(amountToPay);
    token.transfer(vesting.beneficiary, amountToPay);

    emit VestingWithdraw(_vestingId, amountToPay);
  }

  function getWithdrawableAmount(uint256 _vestingId) external view returns (uint256) {
    Vesting storage vesting = getVesting(_vestingId);
    require(vesting.isValid, "Vesting is canceled");

    return _getWithdrawableAmount(vesting);
  }

  function _getWithdrawableAmount(Vesting storage _vesting) internal view returns (uint256) {
    return calculateAvailableAmount(_vesting).sub(_vesting.paidAmount);
  }

  function calculateAvailableAmount(Vesting storage _vesting) internal view returns (uint256) {
    LinearVestingSchedule[] storage vestingSchedule = vestingSchedules[_vesting.vestingSchedule];
    uint256 amountAvailable = 0;
    for (uint256 i = 0; i < vestingSchedule.length; i++) {
      LinearVestingSchedule storage linearSchedule = vestingSchedule[i];
      if (linearSchedule.startDate > block.timestamp) return amountAvailable;
      uint256 amountThisLinearSchedule = calculateLinearVestingAvailableAmount(linearSchedule, _vesting.amount);
      amountAvailable = amountAvailable.add(amountThisLinearSchedule);
    }
    return amountAvailable;
  }

  function calculateLinearVestingAvailableAmount(LinearVestingSchedule storage _linearVesting, uint256 _amount)
    internal
    view
    returns (uint256)
  {
    uint256 elapsedPeriods = calculateElapsedPeriods(_linearVesting);
    if (elapsedPeriods <= _linearVesting.cliffInPeriods) return 0;
    uint256 amountThisVestingSchedule = _amount.mul(_linearVesting.portionOfTotal).div(PORTION_OF_TOTAL_PRECISION);
    uint256 amountPerPeriod =
      amountThisVestingSchedule.mul(_linearVesting.portionPerPeriod).div(PORTION_PER_PERIOD_PRECISION);
    return amountPerPeriod.mul(elapsedPeriods).min(amountThisVestingSchedule);
  }

  function calculateElapsedPeriods(LinearVestingSchedule storage _linearVesting) private view returns (uint256) {
    uint256 periodInSeconds = _linearVesting.periodInMonth.mul(SECONDS_IN_MONTH);
    return block.timestamp.sub(_linearVesting.startDate).div(periodInSeconds);
  }

  function getVesting(uint256 _vestingId) internal view returns (Vesting storage) {
    require(_vestingId < vestings.length, "No vesting with such id");
    return vestings[_vestingId];
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
      VestingSchedule vestingSchedule,
      uint256 paidAmount,
      bool isCancelable
    )
  {
    Vesting storage vesting = getVesting(_vestingId);
    isValid = vesting.isValid;
    beneficiary = vesting.beneficiary;
    amount = vesting.amount;
    vestingSchedule = vesting.vestingSchedule;
    paidAmount = vesting.paidAmount;
    isCancelable = vesting.isCancelable;
  }
}
