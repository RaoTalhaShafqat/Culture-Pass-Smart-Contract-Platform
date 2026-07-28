# About 

This is a code base for Culture-Pass-Platform done as an assignment for Internship in TU-Berlin.

# Getting Started

## Requirements 

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
 
  - If you have done it right you can run:
  ```bash
  git --version
  ```
  - You should see something like:
  ```bash
  git version x.x.x
  ```
  
- [foundry](https://getfoundry.sh/)
  - You will know you did it right if you can run:
  ```bash
  forge --version
  ```
  - You should see something like:
  ```bash
  forge Version: 1.7.1
  Build Timestamp: 2026-05-08T07:50:55.527285345Z
  ```
 ## OneLinearDeploymentCommand
 In order for you to deploy this Proxy system on anvil you need to run the following command:
 `forge script script/DeployCulturePass.s.sol:DeployCulturePass --rpc-url http://127.0.0.1:8545 --private-key $(PRIVATE_KEY) --broadcast` 
 make sure that you have a .env in your project which contains SAFE_ADDRESS & PRIVATE_KEY and make sure before you run this command load your .env file in the terminal.

 ## Developernote

 - Tip please make your own MakeFile to automate all the commands to speed up development Process.
 - Never push .env file to github and never have your private Keys in .env file.
 - For the project Explanation if needed always refer to the ReadMe on the main branch and not this ReadMe in the backend folder.
 - Always refer to NatSpec contract documentation kind of like Javadocs as they have specific info for Developers.
 - If you paste your private Key by mistake make sure to run these commands in your active Bash Terminal `history -c` and then go to your parent directory and run `rm .bash_history` .

 ## Soliditycontractlayout
 - Please make sure to follow this exact Layout as this would make your code readable for other developers.

  Layout of Contract:
 - version
 - imports
 - errors
 - interfaces, libraries, contracts
 - Type declarations
 - State variables
 - Events
 - Modifiers
 - Functions

 - Layout of Functions:
 - constructor
 - receive function (if exists)
 - fallback function (if exists)
 - external
 - public
 - internal
 - private
 - view & pure functions
 
  
  






