import publicConfig from "../publicConfig"
import * as fcl from "@onflow/fcl"
import { generateImportsAndInterfaces } from "./utils"
import Decimal from 'decimal.js'

const FruitPath = "0xFruit"
const FungibleTokenPath = "0xFungibleToken"

/*
export const getNFTDisplays = async (account, nft) => {
}*/

export const queryClaimStatus = async (
  bowlID,
  host,
  claimer
) => {
  const code = `
  import Fruit from 0xFruit

  pub struct ClaimStatus {
      pub let availability: Fruit.Availability
      pub let eligibilityForRegistration: Fruit.Eligibility
      pub let eligibilityForClaim: Fruit.Eligibility
  
      init(
          availability: Fruit.Availability,
          eligibilityForRegistration: Fruit.Eligibility,
          eligibilityForClaim: Fruit.Eligibility
      ) {
          self.availability = availability
          self.eligibilityForRegistration = eligibilityForRegistration
          self.eligibilityForClaim = eligibilityForClaim
      }
  }
  
  pub fun main(bowlID: UInt64, host: Address, claimer: Address): ClaimStatus {
      let bowlCollection =
          getAccount(host)
          .getCapability(Fruit.BowlCollectionPublicPath)
          .borrow<&Fruit.BowlCollection{Fruit.IBowlCollectionPublic}>()
          ?? panic("Could not borrow IBowlCollectionPublic from address")
  
      let bowl = bowlCollection.borrowPublicBowlRef(bowlID: bowlID)
          ?? panic("Could not borrow bowl")
  
      let availability = bowl.checkAvailability(params: {})
      let eligibilityR = bowl.checkRegistrationEligibility(account: claimer, params: {})
      let eligibilityC = bowl.checkClaimEligibility(account: claimer, params: {})
  
      return ClaimStatus(
          availability: availability,
          eligibilityForRegistration: eligibilityR,
          eligibilityForClaim: eligibilityC
      )
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)

  const status = await fcl.query({
    cadence: code,
    args: (arg, t) => [
      arg(bowlID, t.UInt64),
      arg(host, t.Address),
      arg(claimer, t.Address),
    ]
  }) 

  return status
}

export const queryBowl = async (bowlID, host) => {
  const code = `
  import Fruit from 0xFruit

  pub fun main(bowlID: UInt64, host: Address): &{Fruit.IBowlPublic} {
      let bowlCollection =
          getAccount(host)
          .getCapability(Fruit.BowlCollectionPublicPath)
          .borrow<&Fruit.BowlCollection{Fruit.IBowlCollectionPublic}>()
          ?? panic("Could not borrow IBowlCollectionPublic from address")
  
      let bowlRef = bowlCollection.borrowPublicBowlRef(bowlID: bowlID)
          ?? panic("Could not borrow bowl")
  
      return bowlRef
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)

  const bowl = await fcl.query({
    cadence: code,
    args: (arg, t) => [
      arg(bowlID, t.UInt64),
      arg(host, t.Address)
    ]
  }) 

  return bowl
}

export const queryBowls = async (address) => {
  const code = `
  import Fruit from 0xFruit

  pub fun main(account: Address): {UInt64: &{Fruit.IBowlPublic}} {
      let bowlCollection =
          getAccount(account)
          .getCapability(Fruit.BowlCollectionPublicPath)
          .borrow<&Fruit.BowlCollection{Fruit.IBowlCollectionPublic}>()
  
      if let collection = bowlCollection {
          return collection.getAllBowls()
      }
  
      return {}
  }
  `
  .replace(FruitPath, publicConfig.fruitAddress)

  const bowls = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(address, t.Address)]
  }) 

  return bowls ?? []
}

export const queryBalance = async (token, address) => {
  const code = `
    import FungibleToken from 0xFungibleToken
    import ${token.contractName} from ${token.address}
    
    pub fun main(address: Address): UFix64 {
        let account = getAccount(address)
    
        let vaultRef = account
            .getCapability(${token.path.balance})
            .borrow<&${token.contractName}.Vault{FungibleToken.Balance}>()
         
        if let vault = vaultRef {
          return vault.balance
        }
        return 0.0
    }
  `
  .replace(FungibleTokenPath, publicConfig.fungibleTokenAddress)

  const balance = await fcl.query({
    cadence: code,
    args: (arg, t) => [arg(address, t.Address)]
  }) 

  return new Decimal(balance ?? 0.0)
}
