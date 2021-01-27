// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/EnumerableMap.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract ERC1155 is Context, ERC165, IERC1155, IERC20 {
    using SafeMath for uint256;
    using Address for address;

    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;    

    string public name;
    string public symbol;
    uint8 public decimals;

    uint256 private constant ERC20_ID = 1;

    /// @dev tokens total supplies
    mapping (uint256 => uint256) private _mintedTokens;

    /// @dev at index 1 ERC20 bmiDAIx token is stored
    mapping (uint256 => mapping(address => uint256)) private _balances;    
    mapping (address => mapping(address => bool)) private _operatorApprovals;

    mapping (address => mapping (address => uint256)) private _erc20Allowances;

    mapping (address => EnumerableSet.UintSet) private _nftHolderTokens;
    EnumerableMap.UintToAddressMap private _nftTokenOwners;   

    constructor (string memory name_, string memory symbol_) {        
        _setERC20Description(name_, symbol_);

        _registerInterface(_INTERFACE_ID_ERC1155);
    }    

    function balanceOfNFT(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC1155: balance query for the zero address");

        return _nftHolderTokens[owner].length();
    }

    function ownerOfNFT(uint256 tokenId) public view returns (address) {
        return _nftTokenOwners.get(tokenId, "ERC1155: owner query for nonexistent token");
    }

    function tokenOfOwnerByIndexNFT(address owner, uint256 index) public view returns (uint256) {
        return _nftHolderTokens[owner].at(index);
    }

    function totalSupplyNFT() public view returns (uint256) {        
        return _nftTokenOwners.length();
    }

    /// @notice From ERC20
    function totalSupply() public view override returns (uint256) {
        return _mintedTokens[ERC20_ID];
    }

    /// @notice From ERC20
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[ERC20_ID][account];
    }

    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        return _balances[id][account];
    }

    function balanceOfBatch(
        address[] memory accounts,
        uint256[] memory ids
    )
        public
        view
        override
        returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            require(accounts[i] != address(0), "ERC1155: batch balance query for the zero address");
            batchBalances[i] = _balances[ids[i]][accounts[i]];
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) public virtual override {
        require(_msgSender() != operator, "ERC1155: setting approval status for self");

        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view override returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /// @notice From ERC20
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _erc20Allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    /// @notice From ERC20
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _erc20Allowances[_msgSender()][spender].sub(subtractedValue, 
            "ERC20: decreased allowance below zero"));
        return true;
    }

    /// @notice From ERC20
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _erc20Allowances[owner][spender];
    }

    /// @notice From ERC20
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /// @notice From ERC20
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }   

    // From ERC20
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _erc20Allowances[sender][_msgSender()].sub(amount, 
            "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    )
        public
        virtual
        override
    {
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(operator, from, to, _asSingletonArray(id), _asSingletonArray(amount), data);

        if (id == ERC20_ID) {
           _beforeERC20TokenTransfer(from, to, amount); 
        }

        if (_existsNFT(id)) {
            _nftHolderTokens[from].remove(id);
            _nftHolderTokens[to].add(id);

            _nftTokenOwners.set(id, to);
        }

        _balances[id][from] = _balances[id][from].sub(amount, "ERC1155: insufficient balance for transfer");
        _balances[id][to] = _balances[id][to].add(amount);

        emit TransferSingle(operator, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(operator, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        public
        virtual
        override
    {
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: transfer caller is not owner nor approved"
        );

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            if (id == ERC20_ID) {
                _beforeERC20TokenTransfer(from, to, amount); 
            }

            if (_existsNFT(id)) {
                _nftHolderTokens[from].remove(id);
                _nftHolderTokens[to].add(id);

                _nftTokenOwners.set(id, to);
            }

            _balances[id][from] = _balances[id][from].sub(
                amount,
                "ERC1155: insufficient balance for transfer"
            );
            _balances[id][to] = _balances[id][to].add(amount);
        }

        emit TransferBatch(operator, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, from, to, ids, amounts, data);
    }    

    function _setERC20Description(string memory name_, string memory symbol_) internal virtual {
        name = name_;
        symbol = symbol_;
        decimals = 18;
    }

    function _existsToken(uint256 id) internal view returns (bool) {
        return _mintedTokens[id] > 0;
    }

    function _existsNFT(uint256 id) internal view returns (bool) {
        return _nftTokenOwners.contains(id);
    }

    /// @notice From ERC20
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _erc20Allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @notice From ERC20
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeERC20TokenTransfer(sender, recipient, amount);

        _balances[ERC20_ID][sender] = _balances[ERC20_ID][sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[ERC20_ID][recipient] = _balances[ERC20_ID][recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _mintERC20(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeERC20TokenTransfer(address(0), account, amount);
        
        _balances[ERC20_ID][account] = _balances[ERC20_ID][account].add(amount);
        _mintedTokens[ERC20_ID] = _mintedTokens[ERC20_ID].add(amount);

        emit Transfer(address(0), account, amount);
    }    
   
    function _mint(address account, uint256 id, uint256 amount, bytes memory data) internal virtual {
        require(account != address(0), "ERC1155: mint to the zero address");        
        require(amount == 0 || !_existsNFT(id), "ERC1155: NFT token already minted");                

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(
            operator, 
            address(0), 
            account, 
            _asSingletonArray(id), 
            _asSingletonArray(amount), 
            data
        );

        if (amount == 1 && !_existsToken(id) && id != ERC20_ID) {
            _nftHolderTokens[account].add(id);
            _nftTokenOwners.set(id, account);
        }

        _balances[id][account] = _balances[id][account].add(amount);
        _mintedTokens[id] = _mintedTokens[id].add(amount);
        
        emit TransferSingle(operator, address(0), account, id, amount);

        _doSafeTransferAcceptanceCheck(operator, address(0), account, id, amount, data);
    }
   
    function _mintBatch(
        address account, 
        uint256[] memory ids, 
        uint256[] memory amounts, 
        bytes memory data
    ) internal virtual {
        require(account != address(0), "ERC1155: mint to the zero address");
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(operator, address(0), account, ids, amounts, data);

        for (uint i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            
            require(amount == 0 || !_existsNFT(id), "ERC1155: NFT token already minted");

            if (amount == 1 && !_existsToken(id) && id != ERC20_ID) {
                _nftHolderTokens[account].add(id);
                _nftTokenOwners.set(id, account);
            }

            _balances[id][account] = amount.add(_balances[id][account]);
            _mintedTokens[id] = _mintedTokens[id].add(amount);
        }

        emit TransferBatch(operator, address(0), account, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, address(0), account, ids, amounts, data);
    }

    function _burnERC20(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeERC20TokenTransfer(account, address(0), amount);

        _balances[ERC20_ID][account] = _balances[ERC20_ID][account].sub(amount, "ERC20: burn amount exceeds balance");
        _mintedTokens[ERC20_ID] = _mintedTokens[ERC20_ID].sub(amount);

        emit Transfer(account, address(0), amount);
    }
  
    function _burn(address account, uint256 id, uint256 amount) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(
            operator, 
            account, 
            address(0), 
            _asSingletonArray(id), 
            _asSingletonArray(amount), 
            ""
        );                

        if (amount > 0) {
            _nftHolderTokens[account].remove(id);
            _nftTokenOwners.remove(id);
        }

        _balances[id][account] = _balances[id][account].sub(
            amount,
            "ERC1155: burn amount exceeds balance"
        );     

        _mintedTokens[id] = _mintedTokens[id].sub(amount);

        emit TransferSingle(operator, account, address(0), id, amount);
    }

    function _burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");

        address operator = _msgSender();

        _beforeERC1155TokenTransfer(operator, account, address(0), ids, amounts, "");

        for (uint i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            if (amount > 0) {
                _nftHolderTokens[account].remove(id);
                _nftTokenOwners.remove(id);
            }

            _balances[id][account] = _balances[id][account].sub(
                amount,
                "ERC1155: burn amount exceeds balance"
            );            

            _mintedTokens[id] = _mintedTokens[id].sub(amount);
        }

        emit TransferBatch(operator, account, address(0), ids, amounts);
    }

    // From ERC20
    function _beforeERC20TokenTransfer(address from, address to, uint256 amount) internal virtual { }

    function _beforeERC1155TokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal virtual
    { }

    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    )
        private
    {
        if (to.isContract()) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver(to).onERC1155Received.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        private
    {
        if (to.isContract()) {
            try IERC1155Receiver(to).onERC1155BatchReceived(
                operator, 
                from, 
                ids, 
                amounts, 
                data
            ) returns (bytes4 response) {
                if (response != IERC1155Receiver(to).onERC1155BatchReceived.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }
}
