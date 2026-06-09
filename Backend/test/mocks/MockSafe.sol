// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockSafe contract for testing multi-signature wallet functionality.
 * @author Rao Talha Shafqat
 * @notice This contract is a mock implementation of a multi-signature wallet for testing purposes. It allows multiple owners to submit, approve, and execute transactions based on a defined threshold.
 * @dev This contract defines a simple multi-signature wallet with a fixed threshold of 2 approvals required for executing transactions. It includes functions for submitting transactions, approving transactions, and executing transactions.
 */
contract MockSafe {
    /*//////////////////////////////////////////////////////////////
                                errors
    //////////////////////////////////////////////////////////////*/
    error MockSafe__NotOwner();
    error MockSafe__AlreadyApproved();
    error MockSafe__NotEnoughApprovals();
    error MockSafe__AlreadyExecuted();
    error MockSafe__TransactionFailed();

    /*//////////////////////////////////////////////////////////////
                                Structs
    //////////////////////////////////////////////////////////////*/

    struct Tx {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    /*//////////////////////////////////////////////////////////////
                                State Variables & Constants
    //////////////////////////////////////////////////////////////*/
    address[] public s_owners;
    mapping(address => bool) public s_isOwner;
    uint16 public constant THRESHOLD = 2;
    Tx[] public s_txs;
    mapping(uint256 => mapping(address => bool)) public s_isConfirmed;

    /*//////////////////////////////////////////////////////////////
                                Modifiers
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        if (!s_isOwner[msg.sender]) {
            revert MockSafe__NotOwner();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                                Functions
    //////////////////////////////////////////////////////////////*/

    constructor(address[] memory _owners) {
        for (uint256 i = 0; i < _owners.length; i++) {
            s_owners.push(_owners[i]);
            s_isOwner[_owners[i]] = true;
        }
    }

    function submitTx(address _to, uint256 _value, bytes calldata _data) external onlyOwner returns (uint256) {
        s_txs.push(Tx({to: _to, value: _value, data: _data, executed: false, numConfirmations: 0}));
        return s_txs.length - 1;
    }

    function approveTx(uint256 _txId) external onlyOwner {
        Tx storage transaction = s_txs[_txId];
        if (transaction.executed) {
            revert MockSafe__AlreadyExecuted();
        }
        if (s_isConfirmed[_txId][msg.sender]) {
            revert MockSafe__AlreadyApproved();
        }
        s_isConfirmed[_txId][msg.sender] = true;
        transaction.numConfirmations += 1;
    }

    function executeTx(uint256 _txId) external onlyOwner {
        Tx storage transaction = s_txs[_txId];
        if (transaction.executed) {
            revert MockSafe__AlreadyExecuted();
        }
        if (transaction.numConfirmations < THRESHOLD) {
            revert MockSafe__NotEnoughApprovals();
        }
        transaction.executed = true;
        (bool success, bytes memory returndata) = transaction.to.call{value: transaction.value}(transaction.data);

        if (!success) {
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }
    }
}
