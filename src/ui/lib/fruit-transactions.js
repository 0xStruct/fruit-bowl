import publicConfig from "../publicConfig"
import * as fcl from "@onflow/fcl"
import { txHandler, TxStatus } from "./transactions"
import { generateImportsAndInterfaces } from "./utils"

import Decimal from "decimal.js"

const NonFungibleTokenPath = "0xNonFungibleToken"
const FungibleTokenPath = "0xFungibleToken"
const FruitPath = "0xFruit"
const MetadataViewsPath = "0xMetadataViews"
const EligibilityReviewersPath = "0xEligibilityVerifiers"
const FruitRecorderPath = "0xFruitRecorder"

export const createBowl = async (
  name, description, image, url,
  startAt, endAt, registrationEndAt,

  token, wagerAmount, wagerOptions, 
  // whitelist
  withWhitelist,
  whitelist,
  // Floats
  withFloats, threshold, eventIDs, eventHosts,
  withFloatGroup, groupName, groupHost,

  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doCreateBowl(
      name, description, image, url,
      startAt, endAt, registrationEndAt,

      token, wagerAmount, wagerOptions,

      withWhitelist,
      whitelist,
      withFloats, threshold, eventIDs, eventHosts,
      withFloatGroup, groupName, groupHost
    )
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus) 
}

const doCreateBowl = async (
  name, description, image, url,
  startAt, endAt, registrationEndAt, 

  token, wagerAmount, wagerOptions,

  withWhitelist,
  whitelist,
  withFloats, threshold, eventIDs, eventHosts,
  withFloatGroup, groupName, groupHost
) => {
  const tokenIssuer = token.address
  const tokenContractName = token.contractName
  const tokenSymbol = token.symbol
  const tokenProviderPath = token.path.vault.replace("/storage/", "")
  const tokenBalancePath = token.path.balance.replace("/public/", "")
  const tokenReceiverPath = token.path.receiver.replace("/public/", "")

  const code = `
    import FungibleToken from 0xFungibleToken
    import Fruit from 0xFruit
    import EligibilityVerifiers from 0xEligibilityVerifiers

    transaction(
        name: String,
        description: String,
        image: String?,
        url: String?,
        startAt: UFix64?,
        endAt: UFix64?,
        registrationEndAt: UFix64,

        // TokenInfo
        tokenIssuer: Address,
        tokenContractName: String,
        tokenSymbol: String,
        tokenProviderPath: String,
        tokenBalancePath: String,
        tokenReceiverPath: String,

        wagerAmount: UFix64,
        wagerOptions: String,
        // EligibilityVerifier
        // Only support registrationVerify now
        withWhitelist: Bool,
        whitelist: {Address: Bool},

        withFloats: Bool,
        threshold: UInt32?,
        eventIDs: [UInt64],
        eventHosts: [Address],

        withFloatGroup: Bool,
        floatGroupName: String?,
        floatGroupHost: Address?
    ) {
        let bowlCollection: &Fruit.BowlCollection
        let vault: &FungibleToken.Vault

        prepare(acct: AuthAccount) {
            if acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath) == nil {
                acct.save(<- Fruit.createEmptyBowlCollection(), to: Fruit.BowlCollectionStoragePath)
                let cap = acct.link<&Fruit.BowlCollection{Fruit.IBowlCollectionPublic}>(
                    Fruit.BowlCollectionPublicPath,
                    target: Fruit.BowlCollectionStoragePath
                ) ?? panic("Could not link BowlCollection to PublicPath")
            }

            self.bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
                ?? panic("Could not borrow BowlCollection from signer")

            let providerPath = StoragePath(identifier: tokenProviderPath)!
            self.vault = acct.borrow<&FungibleToken.Vault>(from: providerPath)
                ?? panic("Could not borrow Vault from signer")
        }

        execute {
            let tokenInfo = Fruit.TokenInfo(
                account: tokenIssuer,
                contractName: tokenContractName,
                symbol: tokenSymbol,
                providerPath: tokenProviderPath,
                balancePath: tokenBalancePath,
                receiverPath: tokenReceiverPath
            )
            
            var verifier: {EligibilityVerifiers.IEligibilityVerifier}? = nil
            if withWhitelist {
                verifier = EligibilityVerifiers.Whitelist(
                    whitelist: whitelist
                )
            } else if withFloats {
                assert(eventIDs.length == eventHosts.length, message: "eventIDs should have the same length with eventHosts")
                let events: [EligibilityVerifiers.FLOATEventData] = []
                var counter = 0
                while counter < eventIDs.length {
                    let event = EligibilityVerifiers.FLOATEventData(host: eventHosts[counter], eventID: eventIDs[counter])
                    events.append(event)
                    counter = counter + 1
                }
                verifier = EligibilityVerifiers.FLOATsV2(
                    events: events,
                    mintedBefore: getCurrentBlock().timestamp,
                    threshold: threshold!
                )
            } else if withFloatGroup {
                let groupData = EligibilityVerifiers.FLOATGroupData(
                    host: floatGroupHost!,
                    name: floatGroupName!
                )
                verifier = EligibilityVerifiers.FLOATGroupV2(
                    group: groupData,
                    mintedBefore: getCurrentBlock().timestamp,
                    threshold: threshold!
                )
            } else {
                panic("invalid verifier")
            }
            
            let bowlID = self.bowlCollection.createBowl(
                name: name, 
                description: description, 
                host: self.vault.owner!.address, 
                image: image,
                url: url,
                startAt: startAt,
                endAt: endAt,
                registrationEndAt: registrationEndAt,

                tokenInfo: tokenInfo,
                wagerAmount: wagerAmount,
                wagerOptions: wagerOptions,
                vault: <- self.vault.withdraw(amount: 0.0),
                
                registrationVerifyMode: EligibilityVerifiers.VerifyMode.all,
                claimVerifyMode: EligibilityVerifiers.VerifyMode.all,
                registrationVerifiers: [verifier!],
                claimVerifiers: [],
                extraData: {}
            )
        }
    }
    `
    .replace(FungibleTokenPath, publicConfig.fungibleTokenAddress)
    .replace(FruitPath, publicConfig.fruitAddress)
    .replace(EligibilityReviewersPath, publicConfig.eligibilityVerifiersAddress)

  // check if there is a decimal place in the number
  if(!wagerAmount.toString().split(".")[1]) wagerAmount = wagerAmount.toFixed(2)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => {
      const args = [
        arg(name, t.String),
        arg(description, t.String),
        arg(image, t.Optional(t.String)),
        arg(url, t.Optional(t.String)),
        arg(startAt, t.Optional(t.UFix64)),
        arg(endAt, t.Optional(t.UFix64)),
        arg(registrationEndAt, t.UFix64),
        
        arg(tokenIssuer, t.Address),
        arg(tokenContractName, t.String),
        arg(tokenSymbol, t.String),
        arg(tokenProviderPath, t.String),
        arg(tokenBalancePath, t.String),
        arg(tokenReceiverPath, t.String),

        arg(wagerAmount, t.UFix64),
        arg(wagerOptions, t.String),
        arg(withWhitelist, t.Bool),
        arg(whitelist, t.Dictionary({ key: t.Address, value: t.Bool })),
        arg(withFloats, t.Bool),
        arg(threshold, t.Optional(t.UInt32)),
        arg(eventIDs, t.Array(t.UInt64)),
        arg(eventHosts, t.Array(t.Address)),
        arg(withFloatGroup, t.Bool),
        arg(groupName, t.Optional(t.String)),
        arg(groupHost, t.Optional(t.Address))
      ]

      return args
    },
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}

export const register = async (
  raffle, selectedWagerOption,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doRegister(raffle, selectedWagerOption)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus) 
}


const doRegister = async (raffle, selectedWagerOption) => {
    console.log("doRegister: ", raffle)

    const code = `
    import Fruit from 0xFruit
    import FruitRecorder from 0xFruitRecorder
    import ${raffle.tokenInfo.contractName} from ${raffle.tokenInfo.account}
    
    transaction(bowlID: UInt64, host: Address, wagerOption: UInt8) {
        let bowl: &{Fruit.IBowlPublic}
        let recorderRef: &FruitRecorder.Recorder
        let vaultRef: &${raffle.tokenInfo.contractName}.Vault
        let address: Address
    
        prepare(acct: AuthAccount) {
            let bowlCollection = getAccount(host)
                .getCapability(Fruit.BowlCollectionPublicPath)
                .borrow<&Fruit.BowlCollection{Fruit.IBowlCollectionPublic}>()
                ?? panic("Could not borrow the public BowlCollection from the host")
            
            self.bowl = bowlCollection.borrowPublicBowlRef(bowlID: bowlID)
                ?? panic("Could not borrow the public Bowl from the collection")
    
            if (acct.borrow<&FruitRecorder.Recorder>(from: FruitRecorder.RecorderStoragePath) == nil) {
                acct.save(<-FruitRecorder.createEmptyRecorder(), to: FruitRecorder.RecorderStoragePath)
    
                acct.link<&{FruitRecorder.IRecorderPublic}>(
                    FruitRecorder.RecorderPublicPath,
                    target: FruitRecorder.RecorderStoragePath
                )
            }
               
            self.recorderRef = acct
                .borrow<&FruitRecorder.Recorder>(from: FruitRecorder.RecorderStoragePath)
                ?? panic("Could not borrow Recorder")
    
            self.address = acct.address

            // Get a reference to the signer's stored vault
            self.vaultRef = acct.borrow<&${raffle.tokenInfo.contractName}.Vault>(from: /storage/${raffle.tokenInfo.providerPath.identifier})
                ?? panic("Could not borrow reference to the owner's Vault!")
    
        }
    
        execute {
            self.bowl.register(account: self.address, vault: <- self.vaultRef.withdraw(amount: self.bowl.wagerAmount), wagerOption: wagerOption, params: {
                "recorderRef": self.recorderRef
            })
        }
    }    
    `
    .replace(FruitPath, publicConfig.fruitAddress)
    .replace(FruitRecorderPath, publicConfig.fruitRecorderAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => {
      const args = [
        arg(raffle.bowlID, t.UInt64),
        arg(raffle.host.address, t.Address),
        arg(selectedWagerOption, t.UInt8)
      ]

      return args
    },
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}
/*
export const togglePause = async (
  raffleID,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doTogglePause(raffleID)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

const doTogglePause = async (raffleID) => {
  const code = `
  import Mist from 0xMist

  transaction(raffleID: UInt64) {
      let raffle: &Mist.Raffle
  
      prepare(acct: AuthAccount) {
          let bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
              ?? panic("Could not borrow bowlCollection")
  
          self.raffle = bowlCollection.borrowRaffleRef(raffleID: raffleID)!
      }
  
      execute {
          self.raffle.togglePause()
      }
  }
  `
    .replace(FruitPath, publicConfig.fruitAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => (
      [arg(raffleID, t.UInt64)]
    ),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })

  return transactionId
}
*/

/*
export const draw = async (
  raffleID,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doDraw(raffleID)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

const doDraw = async (raffleID) => {
  const code = `
  import Mist from 0xMist

  transaction(raffleID: UInt64) {
      let raffle: &Mist.Raffle
  
      prepare(acct: AuthAccount) {
          let bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
              ?? panic("Could not borrow bowlCollection")
          self.raffle = bowlCollection.borrowRaffleRef(raffleID: raffleID)!
      }
  
      execute {
          self.raffle.draw(params: {})
      }
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => ([
      arg(raffleID, t.UInt64)
    ]),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })

  return transactionId
}

export const batchDraw = async (
  raffleID,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doBatchDraw(raffleID)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

const doBatchDraw = async (raffleID) => {
  const code = `
  import Mist from 0xMist

  transaction(raffleID: UInt64) {
      let raffle: &Mist.Raffle
  
      prepare(acct: AuthAccount) {
          let bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
              ?? panic("Could not borrow bowlCollection")
          self.raffle = bowlCollection.borrowRaffleRef(raffleID: raffleID)!
      }
  
      execute {
          self.raffle.batchDraw(params: {})
      }
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => ([
      arg(raffleID, t.UInt64)
    ]),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })

  return transactionId
}
*/
/*
export const endRaffle = async (
  raffleID, nftContractName, nftContractAddress,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doEndRaffle(raffleID, nftContractName, nftContractAddress)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

export const deleteRaffle = async (
  raffleID, nftContractName, nftContractAddress,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doDeleteRaffle(raffleID, nftContractName, nftContractAddress)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

const doDeleteRaffle = async (
  raffleID, nftContractName, nftContractAddress
) => {
  const code = `
  import Mist from 0xMist
  import NonFungibleToken from 0xNonFungibleToken
  import ${nftContractName} from ${nftContractAddress}
  
  transaction(raffleID: UInt64) {
      let bowlCollection: &Fruit.BowlCollection
      let nftCollectionRef: &${nftContractName}.Collection{NonFungibleToken.CollectionPublic}
  
      prepare(acct: AuthAccount) {
          self.bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
              ?? panic("Could not borrow bowlCollection")
  
          let raffle = self.bowlCollection.borrowRaffleRef(raffleID: raffleID)!
  
          self.nftCollectionRef = acct.borrow<&${nftContractName}.Collection{NonFungibleToken.CollectionPublic}>(from: raffle.nftInfo.collectionStoragePath)
              ?? panic("Could not borrow collection from signer")
      }
  
      execute {
          self.bowlCollection.deleteRaffle(raffleID: raffleID, receiver: self.nftCollectionRef)
      }
  }
  `
  .replace(NonFungibleTokenPath, publicConfig.nonFungibleTokenAddress)
  .replace(FruitPath, publicConfig.fruitAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => ([
      arg(raffleID, t.UInt64)
    ]),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })

  return transactionId
}

const doEndRaffle = async (
  raffleID, nftContractName, nftContractAddress
) => {
  const code = `
  import Mist from 0xMist
  import NonFungibleToken from 0xNonFungibleToken
  import ${nftContractName} from ${nftContractAddress}
  
  transaction(raffleID: UInt64) {
      let raffle: &Mist.Raffle
      let nftCollectionRef: &${nftContractName}.Collection{NonFungibleToken.CollectionPublic}
  
      prepare(acct: AuthAccount) {
          let bowlCollection = acct.borrow<&Fruit.BowlCollection>(from: Fruit.BowlCollectionStoragePath)
              ?? panic("Could not borrow bowlCollection")
  
          self.raffle = bowlCollection.borrowRaffleRef(raffleID: raffleID)!
  
          self.nftCollectionRef = acct.borrow<&${nftContractName}.Collection{NonFungibleToken.CollectionPublic}>(from: self.raffle.nftInfo.collectionStoragePath)
              ?? panic("Could not borrow collection from signer")
      }
  
      execute {
          self.raffle.end(receiver: self.nftCollectionRef)
      }
  }
  `
  .replace(NonFungibleTokenPath, publicConfig.nonFungibleTokenAddress)
  .replace(FruitPath, publicConfig.fruitAddress)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => ([
      arg(raffleID, t.UInt64)
    ]),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })

  return transactionId
}
*/

/*
export const claim = async (
  raffleID, host, nftInfo,
  setTransactionInProgress,
  setTransactionStatus
) => {
  const txFunc = async () => {
    return await doClaim(raffleID, host, nftInfo)
  }

  return await txHandler(txFunc, setTransactionInProgress, setTransactionStatus)
}

const doClaim = async (
  raffleID,
  host,
  nftInfo
) => {
  const nftContractName = nftInfo.contractName
  const storagePath = `/storage/${nftInfo.collectionStoragePath.identifier}`
  const publicPath = `/public/${nftInfo.collectionPublicPath.identifier}`

  const restrictions = nftInfo.collectionType.restrictions.map((r) => r.typeID)
  const [imports, interfaces] = generateImportsAndInterfaces(restrictions)

  const rawCode = `
  import Mist from 0xMist
  import FruitRecorder from 0xFruitRecorder
  
  transaction(raffleID: UInt64, host: Address) {
      let raffle: &{Mist.IRafflePublic}
      let receiver: &{NonFungibleToken.CollectionPublic}
      let recorderRef: &FruitRecorder.Recorder
  
      prepare(acct: AuthAccount) {
          let bowlCollection = getAccount(host)
              .getCapability(Fruit.BowlCollectionPublicPath)
              .borrow<&Fruit.BowlCollection{Mist.IRaffleCollectionPublic}>()
              ?? panic("Could not borrow the public RaffleCollection from the host")
          
          let raffle = bowlCollection.borrowPublicRaffleRef(raffleID: raffleID)
              ?? panic("Could not borrow the public Raffle from the collection")
          
          if acct.borrow<&NonFungibleToken.Collection>(from: ${storagePath}) != nil 
            && !acct.getCapability<&{${interfaces}}>(${publicPath}).check() {
            acct.unlink(${publicPath})
            acct.link<&{${interfaces}}>(
              ${publicPath},
              target: ${storagePath}
            )
          } else if (acct.borrow<&${nftContractName}.Collection>(from: ${storagePath}) == nil) {
              acct.save(<-${nftContractName}.createEmptyCollection(), to: ${storagePath})
  
              acct.link<&{${interfaces}}>(
                  ${publicPath},
                  target: ${storagePath}
              )
          }

          if (acct.borrow<&FruitRecorder.Recorder>(from: FruitRecorder.RecorderStoragePath) == nil) {
            acct.save(<-FruitRecorder.createEmptyRecorder(), to: FruitRecorder.RecorderStoragePath)

            acct.link<&{FruitRecorder.IRecorderPublic}>(
                FruitRecorder.RecorderPublicPath,
                target: FruitRecorder.RecorderStoragePath
            )
          }
          
          self.raffle = raffle 
          self.receiver = acct
              .getCapability(${publicPath})
              .borrow<&{NonFungibleToken.CollectionPublic}>()
              ?? panic("Could not borrow Receiver")

          self.recorderRef = acct
            .borrow<&FruitRecorder.Recorder>(from: FruitRecorder.RecorderStoragePath)
            ?? panic("Could not borrow Recorder")
      }
  
      execute {
        self.raffle.claim(receiver: self.receiver, params: {
          "recorderRef": self.recorderRef
        })
      }
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)
  .replace(FruitRecorderPath, publicConfig.fruitRecorderAddress)

  const code = imports.concat(rawCode)

  const transactionId = await fcl.mutate({
    cadence: code,
    args: (arg, t) => (
      [
        arg(raffleID, t.UInt64),
        arg(host, t.Address)
      ]
    ),
    proposer: fcl.currentUser,
    payer: fcl.currentUser,
    limit: 9999
  })
  return transactionId
}
*/