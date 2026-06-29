interface ContractsConfig {
    [chainId: number]: {
        CulturePassProxy: string
    }
}

export const chainsToCulturePass: ContractsConfig = {
    31337: {
        CulturePassProxy: "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
    }
}

export const abi = [
    {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "UPGRADE_INTERFACE_VERSION",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "c_ticketToken",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract TicketToken"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPassInfo",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "tier",
                "type": "uint8",
                "internalType": "enum CulturePass.Tier"
            },
            {
                "name": "expiry",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRemainingCategoryVisits",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "category",
                "type": "uint8",
                "internalType": "enum CulturePass.Category"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRemainingTicketTokens",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getVenueEarnings",
        "inputs": [
            {
                "name": "_venueWallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "tickets",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "ethValue",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_ticketTokenAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_initialOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proxiableUUID",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "purchasePass",
        "inputs": [
            {
                "name": "_tier",
                "type": "uint8",
                "internalType": "enum CulturePass.Tier"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "reactivateVenue",
        "inputs": [
            {
                "name": "_venueId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "redeemEntry",
        "inputs": [
            {
                "name": "_venueId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "registerVenue",
        "inputs": [
            {
                "name": "_venueId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_name",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_wallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_category",
                "type": "uint8",
                "internalType": "enum CulturePass.Category"
            },
            {
                "name": "_entryPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_dailyCapacity",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "removeVenue",
        "inputs": [
            {
                "name": "_venueId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renewPass",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "s_categoryVisits",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "",
                "type": "uint8",
                "internalType": "enum CulturePass.Category"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_exchangeRate",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_passTiers",
        "inputs": [
            {
                "name": "",
                "type": "uint8",
                "internalType": "enum CulturePass.Tier"
            }
        ],
        "outputs": [
            {
                "name": "monthlyTickets",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "priceETH",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "monthlyVisitCap",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_userPasses",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "tier",
                "type": "uint8",
                "internalType": "enum CulturePass.Tier"
            },
            {
                "name": "expiry",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_venueDailyVisits",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_venueEarnings",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_venues",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "venueId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "name",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "wallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "category",
                "type": "uint8",
                "internalType": "enum CulturePass.Category"
            },
            {
                "name": "entryPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "dailyCapacity",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "isActive",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "setExchangeRate",
        "inputs": [
            {
                "name": "_newRate",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setPassTier",
        "inputs": [
            {
                "name": "_tier",
                "type": "uint8",
                "internalType": "enum CulturePass.Tier"
            },
            {
                "name": "_monthlyTickets",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_priceETH",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_monthlyVisitCap",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateVenue",
        "inputs": [
            {
                "name": "_venueId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_newEntryPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_newDailyCapacity",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "upgradeToAndCall",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "withdrawEarnings",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "Initialized",
        "inputs": [
            {
                "name": "version",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Upgraded",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AddressEmptyCode",
        "inputs": [
            {
                "name": "target",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "CulturePass__exchangeRateNotSet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__falseCategory",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__insufficientFunds",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__invalidDailyCapacity",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__invalidEntryPrice",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__invalidName",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__invalidTier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__invalidWalletAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__montlyLimitReachedForPass",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__noActivePass",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__noEarningsToWithdraw",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__notVenueOwner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__passExpired",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__passStillNOTExpired",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__venueAlreadyActive",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__venueAlreadyExists",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__venueClosedForTheDay",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__venueNotFound",
        "inputs": []
    },
    {
        "type": "error",
        "name": "CulturePass__withdrawalFailed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ERC1967InvalidImplementation",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967NonPayable",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "NotInitializing",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "UUPSUnauthorizedCallContext",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UUPSUnsupportedProxiableUUID",
        "inputs": [
            {
                "name": "slot",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    }
] as const;    