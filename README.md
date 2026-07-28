# Extended ReadMe

## What is this Project?
Culture Pass is a decentralized cultural-access platform that links museums, galleries, theatres and heritage sites through a single blockchain-based membership. Visitors purchase a monthly pass, receive ERC-1155 ticket credits, and redeem entries across every registered venue.

 ## Quickstart

 ```
 git clone https://github.com/RaoTalhaShafqat/Culture-Pass-Smart-Contract-Platform.git
 cd Culture-Pass-Smart-Contract-Platform
 forge build
 ``` 

## Architecture & Decisions 

1. In order to solve the Data Persistency across different version of our Business Logic Contract we implemented a **Delegation system with Proxy**. This problem of Data Persistency lead us to this component of our system. Plus this makes Frontend more simpler to implement and we do not need a separate Contract Registery. 
2. In order to solve the admin control problem and to remove control from a single entity we integrated a **Multi-Sig Wallet** which make the Admin side more decentralised. 
3. In order to solve a gas problem and to have a more gas efficient system we decided an off chain component which is a **Database(Supabase)** to store a list of registered venues off chain. So on chain we store only a map of venues which is gas efficient in nature and for us to loop through a list of venues for the Frontend we have this off chain Database component.
4. For the purpose of simplicity we made **three different Frontends** for three different Stakeholders (Admin, Visitor & Venue).

## How to run the project
- Please refer to Readme of every single directory to understand how to deploy which component.
- For testing purpose you can also refer to our github page deployment where you can Test our Visitor Frontend on local Chain or Sepolia.

## AI Usage
1. AI was a extremly important part of the project as it was used as an assistent. (*70% Code is handwritten with AI Suggestions*)
2. AI agents such as Claude Fable 5 was used in some parts which were a bit out of the scope of this course such parts include Safewallet integration & some Supabase Integration logic. (*30% Code by Agent*)

## Work Distribution
  *Three Developers worked on this project (Rao Talha, Alp & Yusuf).*
1. Rao Talha was responsible for the following:
- Visitor and Admin Business Functions.
- Frontend for Admin and Venues.
- Proxy and Safewallet.
1. Alp was responsible for the following:
- Database(Supabase) - list of Venues. 
- Qr Code logic and Scanning logic in VisitorUI.
- 40% implementation of VisitorUI.
1. Yusuf was responsible for the following:
- Venue Business Functions.
- Implementing Upgrade and Cancel Subscription on VisitorUI so roughly about 40% of implementation of VisitorUI. 
- Securing contract from Reentrancy Attacks. 

In between when Implementing VisitorUI Rao worked roughly 20% on the UI also.

## Achievement
*Things we are proud that we did:*
1.  We delivered almost production ready system.
2.  We thought about state Management.
3.  We tried to load some things off Chain because of Gas Problem.
4.  We took away the single point of control from Admin by doing a Multi-sig wallet.
5.  We delivered a pleasant Frontend for Visitors.
6.  We tested the system against a common Reentrancy Attack.
7.  We implemented a Mock Multi-sig Safe for the local Development.

## Poster Session
- Our System need Technically one node to run which is a local Anvil Node.
- Our System can run also on multiple Nodes as we have deployed it to Sepolia and Sepolia has multiple Nodes running on it. 