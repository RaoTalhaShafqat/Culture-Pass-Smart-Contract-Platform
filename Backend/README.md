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

 ## Quickstart

 ```
 git clone https://github.com/RaoTalhaShafqat/Culture-Pass-Smart-Contract-Platform.git
 cd Culture-Pass-Smart-Contract-Platform
 forge build
 ``` 

 ## Developernote

 - Always refer to the MakeFile in the project as it is there to build you and run things as smooth as possible.
 - Never push .env file to github and never have your private Keys in .env file.
 - For the project Explanation if needed always refer to the ReadMe on the main branch and not this ReadMe in the backend folder.
 - Always refer to NatSpec contract documentation kind of like Javadocs as they have specific info for Developers.

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
 
  
  






