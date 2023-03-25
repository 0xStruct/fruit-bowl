// https://play.flow.com/0c06fd21-9c6e-45f3-a301-aacc449fce60?type=tx&id=c199a9ab-cd82-4bde-ae07-381eb02a994f&storage=none
import FungibleToken from "../contracts/core/FungibleToken.cdc"
import Fruit from "../contracts/Fruit.cdc"
import EligibilityVerifiers from "../contracts/EligibilityVerifiers.cdc"

transaction(
    name: String,
    description: String,
    image: String?,
    url: String?,
    startAt: UFix64?,
    endAt: UFix64?,
    registrationEndAt: UFix64,
    numberOfWinners: UInt64,

    // TokenInfo
    tokenIssuer: Address,
    tokenContractName: String,
    tokenSymbol: String,
    tokenProviderPath: String,
    tokenBalancePath: String,
    tokenReceiverPath: String,

    rewardTokenIDs: [UInt64],
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
            acct.save(<- Cloud.createEmptyDropCollection(), to: Fruit.BowlCollectionStoragePath)
            let cap = acct.link<&Fruit.BowlCollection{Cloud.IDropCollectionPublic}>(
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

        //let collection <- ExampleNFT.createEmptyCollection()
        /*let bowlID = self.bowlCollection.createRaffle(
            name: name, 
            description: description, 
            host: self.nftCollectionRef.owner!.address, 
            image: image,
            url: url,
            startAt: startAt,
            endAt: endAt,
            registrationEndAt: registrationEndAt,
            numberOfWinners: numberOfWinners,
            nftInfo: nftInfo,
            collection: <- collection,
            registrationVerifyMode: EligibilityVerifiers.VerifyMode.all,
            claimVerifyMode: EligibilityVerifiers.VerifyMode.all,
            registrationVerifiers: [verifier!],
            claimVerifiers: [],
            extraData: {}
        )*/
        
        let bowlID = self.bowlCollection.createBowl(
            name: name, 
            description: description, 
            host: self.vault.owner!.address, 
            image: image,
            url: url,
            startAt: startAt,
            endAt: endAt,
            registrationEndAt: registrationEndAt,
            //numberOfWinners: numberOfWinners,
            tokenInfo: tokenInfo,
            vault: <- self.vault.withdraw(amount: 0.0),
            registrationVerifyMode: EligibilityVerifiers.VerifyMode.all,
            claimVerifyMode: EligibilityVerifiers.VerifyMode.all,
            registrationVerifiers: [verifier!],
            extraData: {}
        )
    }
}