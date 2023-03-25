// Made by 0xStruct
// Inspired and referenced from Lanford33 of Drizzle
//
// Bowl.cdc defines the a p2p wager pool to with an outcome for winners decided by host/judges
//
// There are stages in a BOWL
// 1. host create a bowl (available picks, wager amount, participant eligibility, judges)
// 2. eligible players pay the wager amount, choose their picks
// 3. host/judges decide on the winning pick
// 4. distribute the amount in a bowl equally to the winning players

// https://play.flow.com/0c06fd21-9c6e-45f3-a301-aacc449fce60?type=account&id=13aa5129-eaf8-4ffb-aa34-a48bea6bdb2d&storage=none

import FungibleToken from "./core/FungibleToken.cdc"
import EligibilityVerifiers from "./EligibilityVerifiers.cdc"
import FruitRecorder from "./FruitRecorder.cdc"


pub contract Fruit {

    pub let FruitAdminStoragePath: StoragePath
    pub let FruitAdminPublicPath: PublicPath
    pub let FruitAdminPrivatePath: PrivatePath

    pub let BowlCollectionStoragePath: StoragePath
    pub let BowlCollectionPublicPath: PublicPath
    pub let BowlCollectionPrivatePath: PrivatePath

    pub event ContractInitialized()

    pub event BowlCreated(bowlID: UInt64, name: String, host: Address, description: String, tokenIdentifier: String)
    pub event BowlRegistered(bowlID: UInt64, name: String, host: Address, registrator: Address, tokenIdentifier: String)
    //pub event BowlWinnerDrawn(bowlID: UInt64, name: String, host: Address, winner: Address, tokenIdentifier: String, amount: UFix64)
    pub event BowlClaimed(bowlID: UInt64, name: String, host: Address, claimer: Address, tokenIdentifier: String, amount: UFix64)
    pub event BowlPaused(bowlID: UInt64, name: String, host: Address)
    pub event BowlUnpaused(bowlID: UInt64, name: String, host: Address)
    pub event BowlEnded(bowlID: UInt64, name: String, host: Address)
    pub event BowlDestroyed(bowlID: UInt64, name: String, host: Address)

    pub enum AvailabilityStatus: UInt8 {
        pub case notStartYet
        pub case ended
        pub case registering
        pub case drawing
        pub case drawn
        pub case expired
        pub case paused
    }

    pub struct Availability {
        pub let status: AvailabilityStatus
        pub let extraData: {String: AnyStruct}

        init(status: AvailabilityStatus, extraData: {String: AnyStruct}) {
            self.status = status
            self.extraData = extraData
        }

        pub fun getStatus(): String {
            switch self.status {
            case AvailabilityStatus.notStartYet:
                return "not start yet"
            case AvailabilityStatus.ended:
                return "ended"
            case AvailabilityStatus.registering:
                return "registering"
            case AvailabilityStatus.drawing:
                return "deciding"
            case AvailabilityStatus.drawn:
                return "decided"
            case AvailabilityStatus.expired:
                return "expired"
            case AvailabilityStatus.paused:
                return "paused"
            }
            panic("invalid status")
        }
    }

    pub enum EligibilityStatus: UInt8 {
        pub case eligibleForRegistering
        pub case eligibleForClaiming

        pub case notEligibleForRegistering
        pub case notEligibleForClaiming

        pub case hasRegistered
        pub case hasClaimed
    }

    pub struct Eligibility {
        pub let status: EligibilityStatus
        pub let eligibleAmount: UFix64
        pub let extraData: {String: AnyStruct}

        init(
            status: EligibilityStatus, 
            eligibleAmount: UFix64,
            extraData: {String: AnyStruct}) {
            self.status = status
            self.eligibleAmount = eligibleAmount
            self.extraData = extraData
        }

        pub fun getStatus(): String {
            switch self.status {
            case EligibilityStatus.eligibleForRegistering: 
                return "eligible for registering"
            case EligibilityStatus.eligibleForClaiming:
                return "eligible for claiming"
            case EligibilityStatus.notEligibleForRegistering:
                return "not eligible for registering"
            case EligibilityStatus.notEligibleForClaiming:
                return "not eligible for claiming"
            case EligibilityStatus.hasRegistered:
                return "has registered"
            case EligibilityStatus.hasClaimed:
                return "has claimed" 
            }
            panic("invalid status")
        }
    }

    // @struct tokeninfo of token that participants pay to enter
    // TokenInfo stores the information of the FungibleToken in a BOWL
    pub struct TokenInfo {
        pub let tokenIdentifier: String
        pub let providerIdentifier: String
        pub let balanceIdentifier: String
        pub let receiverIdentifier: String
        pub let account: Address
        pub let contractName: String
        pub let symbol: String
        pub let providerPath: StoragePath
        pub let balancePath: PublicPath
        pub let receiverPath: PublicPath

        init(
            account: Address, 
            contractName: String,
            symbol: String,
            providerPath: String,
            balancePath: String,
            receiverPath: String 
        ) {
            let address = account.toString()
            let addrTrimmed = address.slice(from: 2, upTo: address.length)

            self.tokenIdentifier = "A.".concat(addrTrimmed).concat(".").concat(contractName)
            self.providerIdentifier = self.tokenIdentifier.concat(".Vault")
            self.balanceIdentifier = self.tokenIdentifier.concat(".Balance")
            self.receiverIdentifier = self.tokenIdentifier.concat(".Receiver")
            self.account = account
            self.contractName = contractName
            self.symbol = symbol
            self.providerPath = StoragePath(identifier: providerPath)!
            self.balancePath = PublicPath(identifier: balancePath)!
            self.receiverPath = PublicPath(identifier: receiverPath)!
        }
    }

    pub struct RegistrationRecord {
        pub let address: Address
        pub let wagerOption: UInt8
        pub let extraData: {String: AnyStruct}

        init(address: Address, wagerOption: UInt8, extraData: {String: AnyStruct}) {
            self.address = address
            self.wagerOption = wagerOption
            self.extraData = extraData
        }
    }

    pub struct WinnerRecord {
        pub let address: Address
        pub let winAmount: UFix64
        pub let extraData: {String: AnyStruct}
        pub var isClaimed: Bool

        access(contract) fun markAsClaimed() {
            self.isClaimed = true
            self.extraData["claimedAt"] = getCurrentBlock().timestamp
        }

        init(
            address: Address, 
            winAmount: UFix64,
            extraData: {String: AnyStruct}
        ) {
            self.address = address
            self.winAmount = winAmount
            self.extraData = extraData
            self.isClaimed = false
        }
    }

    pub resource interface IBowlPublic {
        pub let bowlID: UInt64
        pub let name: String
        pub let description: String
        pub let host: Address
        pub let createdAt: UFix64
        pub let image: String?
        pub let url: String?
        pub let startAt: UFix64?
        pub let endAt: UFix64?

        pub let registrationEndAt: UFix64

        pub let tokenInfo: TokenInfo

        pub let wagerAmount: UFix64
        pub let wagerOptions: String
        pub var wagerOptionFinal: UInt8?

        pub let registrationVerifyMode: EligibilityVerifiers.VerifyMode
        pub let claimVerifyMode: EligibilityVerifiers.VerifyMode

        pub var isPaused: Bool
        pub var isEnded: Bool

        pub let extraData: {String: AnyStruct}

        pub fun register(account: Address, vault: @FungibleToken.Vault, wagerOption: UInt8, params: {String: AnyStruct})
        pub fun hasRegistered(account: Address): Bool
        pub fun getRegistrationRecords(): {Address: RegistrationRecord}
        pub fun getRegistrationRecord(account: Address): RegistrationRecord?

        pub fun getWinners(): {Address: WinnerRecord}
        pub fun getWinner(account: Address): WinnerRecord?

        pub fun claim(receiver: &{FungibleToken.Receiver}, params: {String: AnyStruct})
        pub fun checkAvailability(params: {String: AnyStruct}): Availability
        pub fun checkRegistrationEligibility(account: Address, params: {String: AnyStruct}): Eligibility
        pub fun checkClaimEligibility(account: Address, params: {String: AnyStruct}): Eligibility

        pub fun getBowlBalance(): UFix64
        pub fun getRegistrationVerifiers(): {String: [{EligibilityVerifiers.IEligibilityVerifier}]}
        pub fun getClaimVerifiers(): {String: [{EligibilityVerifiers.IEligibilityVerifier}]}
        
    }

    pub resource Bowl: IBowlPublic {
        pub let bowlID: UInt64
        pub let name: String
        pub let description: String
        pub let host: Address
        pub let createdAt: UFix64
        pub let image: String?
        pub let url: String?
        pub let startAt: UFix64?
        pub let endAt: UFix64?

        pub let registrationEndAt: UFix64

        pub let tokenInfo: TokenInfo

        pub let wagerAmount: UFix64
        pub let wagerOptions: String
        pub var wagerOptionFinal: UInt8?

        pub let registrationVerifyMode: EligibilityVerifiers.VerifyMode
        pub let claimVerifyMode: EligibilityVerifiers.VerifyMode

        pub var isPaused: Bool
        // After a Bowl ended, it can't be recovered.
        pub var isEnded: Bool

        pub let extraData: {String: AnyStruct}

        // Check an account is eligible for registration or not
        access(account) let registrationVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]}
        // Check a winner account is eligible for claiming the reward or not
        // This is mainly used to allow the host add some extra requirements to the winners
        access(account) let claimVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]}
        access(self) let bowlVault: @FungibleToken.Vault
        // The information of registrants
        access(self) let registrationRecords: {Address: RegistrationRecord}
        // The information of winners
        access(self) let winners: {Address: WinnerRecord}
        // Candidates stores the accounts of registrants. It's a helper field to make drawing easy
        access(self) let candidates: [Address]

        // @struct participants register to pay and make a pick
        pub fun register(account: Address, vault: @FungibleToken.Vault, wagerOption: UInt8, params: {String: AnyStruct}) {
            pre {
                // check wagerAmount == vault
                vault.balance == self.wagerAmount : "exact wager amount must be deposited to register"
            }
            params.insert(key: "recordUsedNFT", true)
            let availability = self.checkAvailability(params: params)
            assert(availability.status == AvailabilityStatus.registering, message: availability.getStatus())

            let eligibility = self.checkRegistrationEligibility(account: account, params: params)
            assert(eligibility.status == EligibilityStatus.eligibleForRegistering, message: eligibility.getStatus())

            emit BowlRegistered(
                bowlID: self.bowlID, 
                name: self.name, 
                host: self.host, 
                registrator: account, 
                tokenIdentifier: self.tokenInfo.tokenIdentifier
            )

            self.registrationRecords[account] = RegistrationRecord(address: account, wagerOption: wagerOption, extraData: {})
            self.candidates.append(account)

            // @struct, participant makes payment, deposits into the bowlVault
            self.bowlVault.deposit(from: <- vault)
            
            if let recorderRef = params["recorderRef"] {
                let _recorderRef = recorderRef as! &FruitRecorder.Recorder 
                _recorderRef.insertOrUpdateRecord(FruitRecorder.FruitBowl(
                    bowlID: self.bowlID,
                    host: self.host,
                    name: self.name,
                    tokenSymbol: self.tokenInfo.symbol,
                    registeredAt: getCurrentBlock().timestamp,
                    extraData: {}
                ))
            }
        }

        pub fun hasRegistered(account: Address): Bool {
            return self.registrationRecords[account] != nil
        }

        pub fun getRegistrationRecords(): {Address: RegistrationRecord} {
            return self.registrationRecords
        }

        pub fun getRegistrationRecord(account: Address): RegistrationRecord? {
            return self.registrationRecords[account]
        }

        pub fun getWinners(): {Address: WinnerRecord} {
            return self.winners
        }

        pub fun getWinner(account: Address): WinnerRecord? {
            return self.winners[account]
        }

        pub fun claim(receiver: &{FungibleToken.Receiver}, params: {String: AnyStruct}) {
            params.insert(key: "recordUsedNFT", true)
            let availability = self.checkAvailability(params: params)
            assert(availability.status == AvailabilityStatus.drawn || availability.status == AvailabilityStatus.drawing, message: availability.getStatus())

            let claimer = receiver.owner!.address
            let eligibility = self.checkClaimEligibility(account: claimer, params: params)
            assert(eligibility.status == EligibilityStatus.eligibleForClaiming, message: eligibility.getStatus())

            self.winners[claimer]!.markAsClaimed()
            let winnerRecord = self.winners[claimer]!

            emit BowlClaimed(
                bowlID: self.bowlID, 
                name: self.name, 
                host: self.host, 
                claimer: claimer, 
                tokenIdentifier: self.tokenInfo.tokenIdentifier,
                amount: winnerRecord.winAmount
            )

            if let recorderRef = params["recorderRef"] {
                let _recorderRef = recorderRef as! &FruitRecorder.Recorder 
                if let record = _recorderRef.getRecord(type: Type<FruitRecorder.FruitBowl>(), uuid: self.bowlID) {
                    let _record = record as! FruitRecorder.FruitBowl
                    _record.markAsClaimed(
                        claimedAmount: winnerRecord.winAmount,
                        extraData: {}
                    )
                    _recorderRef.insertOrUpdateRecord(_record)
                }
            }

            let v <- self.bowlVault.withdraw(amount: winnerRecord.winAmount)
            receiver.deposit(from: <- v)
        }

        pub fun checkAvailability(params: {String: AnyStruct}): Availability {
            if self.isEnded {
                return Availability(
                    status: AvailabilityStatus.ended, 
                    extraData: {}
                )
            }

            if let startAt = self.startAt {
                if getCurrentBlock().timestamp < startAt {
                    return Availability(
                        status: AvailabilityStatus.notStartYet,
                        extraData: {}
                    )
                }
            }

            if let endAt = self.endAt {
                if getCurrentBlock().timestamp > endAt {
                    return Availability(
                        status: AvailabilityStatus.expired,
                        extraData: {}
                    )
                }
            }

            if self.isPaused {
                return Availability(
                    status: AvailabilityStatus.paused,
                    extraData: {}
                ) 
            }

            //assert(UInt64(self.winners.keys.length) <= self.numberOfWinners, message: "invalid winners")

            /*if (UInt64(self.winners.keys.length) == self.numberOfWinners) {
                return Availability(
                    status: AvailabilityStatus.drawn,
                    extraData: {}
                )
            }*/

            if getCurrentBlock().timestamp > self.registrationEndAt {
                if self.candidates.length == 0 {
                    return Availability(
                        status: AvailabilityStatus.drawn,
                        extraData: {} 
                    ) 
                }
                return Availability(
                    status: AvailabilityStatus.drawing,
                    extraData: {} 
                )
            }

            return Availability(
                status: AvailabilityStatus.registering,
                extraData: {}
            )
        }

        pub fun checkRegistrationEligibility(account: Address, params: {String: AnyStruct}): Eligibility {
            if let record = self.registrationRecords[account] {
                return Eligibility(
                    status: EligibilityStatus.hasRegistered,
                    eligibleAmount: 0.0,
                    extraData: {}
                )
            }

            let isEligible = self.isEligible(
                account: account,
                mode: self.registrationVerifyMode,
                verifiers: &self.registrationVerifiers as &{String: [{EligibilityVerifiers.IEligibilityVerifier}]},
                params: params
            ) 

            return Eligibility(
                status: isEligible ? 
                    EligibilityStatus.eligibleForRegistering : 
                    EligibilityStatus.notEligibleForRegistering,
                eligibleAmount: 0.0,
                extraData: {}
            )
        }

        pub fun checkClaimEligibility(account: Address, params: {String: AnyStruct}): Eligibility {
            if self.winners[account] == nil {
                return Eligibility(
                    status: EligibilityStatus.notEligibleForClaiming,
                    eligibleAmount: 0.0,
                    extraData: {}
                )
            }

            let record = self.winners[account]!
            if record.isClaimed {
                return Eligibility(
                    status: EligibilityStatus.hasClaimed,
                    eligibleAmount: record.winAmount,
                    extraData: {}
                ) 
            }

            // Bowl host can add extra requirements to the winners for claiming
            // by adding claimVerifiers
            let isEligible = self.isEligible(
                account: account,
                mode: self.claimVerifyMode,
                verifiers: &self.claimVerifiers as &{String: [{EligibilityVerifiers.IEligibilityVerifier}]},
                params: params
            ) 

            return Eligibility(
                status: isEligible ? 
                    EligibilityStatus.eligibleForClaiming: 
                    EligibilityStatus.notEligibleForClaiming,
                eligibleAmount: record.winAmount,
                extraData: {}
            ) 
        }

        pub fun getBowlBalance(): UFix64 {
            return self.bowlVault.balance
        }

        pub fun getRegistrationVerifiers(): {String: [{EligibilityVerifiers.IEligibilityVerifier}]} {
            return self.registrationVerifiers
        }

        pub fun getClaimVerifiers(): {String: [{EligibilityVerifiers.IEligibilityVerifier}]} {
            return self.claimVerifiers
        }

        access(self) fun isEligible(
            account: Address,
            mode: EligibilityVerifiers.VerifyMode, 
            verifiers: &{String: [{EligibilityVerifiers.IEligibilityVerifier}]},
            params: {String: AnyStruct}
        ): Bool {
            params.insert(key: "claimer", account)
            var recordUsedNFT = false 
            if let _recordUsedNFT = params["recordUsedNFT"] {
                recordUsedNFT = _recordUsedNFT as! Bool
            }
            if mode == EligibilityVerifiers.VerifyMode.oneOf {
                for identifier in verifiers.keys {
                    let _verifiers = &verifiers[identifier]! as &[{EligibilityVerifiers.IEligibilityVerifier}]
                    var counter = 0
                    while counter < _verifiers.length {
                        let result = _verifiers[counter].verify(account: account, params: params)
                        if result.isEligible {
                            if recordUsedNFT {
                                if let v = _verifiers[counter] as? {EligibilityVerifiers.INFTRecorder} {
                                    (_verifiers[counter] as! {EligibilityVerifiers.INFTRecorder}).addUsedNFTs(account: account, nftTokenIDs: result.usedNFTs)
                                }
                            }
                            return true
                        }
                        counter = counter + 1
                    }
                }
                return false
            } 

            if mode == EligibilityVerifiers.VerifyMode.all {
                let tempUsedNFTs: {String: {UInt64: [UInt64]}} = {}
                for identifier in verifiers.keys {
                    let _verifiers = &verifiers[identifier]! as &[{EligibilityVerifiers.IEligibilityVerifier}]
                    var counter: UInt64 = 0
                    while counter < UInt64(_verifiers.length) {
                        let result = _verifiers[counter].verify(account: account, params: params)
                        if !result.isEligible {
                            return false
                        }
                        if recordUsedNFT && result.usedNFTs.length > 0 {
                            if tempUsedNFTs[identifier] == nil {
                                let v: {UInt64: [UInt64]} = {}
                                tempUsedNFTs[identifier] = v
                            }
                            (tempUsedNFTs[identifier]!).insert(key: counter, result.usedNFTs)
                        }
                        counter = counter + 1
                    }
                }

                if recordUsedNFT {
                    for identifier in tempUsedNFTs.keys {
                        let usedNFTsInfo = tempUsedNFTs[identifier]!
                        let _verifiers = &verifiers[identifier]! as &[{EligibilityVerifiers.IEligibilityVerifier}]
                        for index in usedNFTsInfo.keys {
                            (_verifiers[index] as! {EligibilityVerifiers.INFTRecorder}).addUsedNFTs(account: account, nftTokenIDs: usedNFTsInfo[index]!)
                        }
                    }
                }
                return true
            }
            panic("invalid mode: ".concat(mode.rawValue.toString()))
        }

        // @struct
        // pub fun draw
        // pub fun batchDraw
        // winning amount is to be set in winnerRecord


        // private methods

        pub fun togglePause(): Bool {
            pre { 
                !self.isEnded: "Bowl has ended" 
            }

            self.isPaused = !self.isPaused
            if self.isPaused {
                emit BowlPaused(bowlID: self.bowlID, name: self.name, host: self.host)
            } else {
                emit BowlUnpaused(bowlID: self.bowlID, name: self.name, host: self.host)
            }
            return self.isPaused
        }

        // deposit more FT into the Bowl
        pub fun deposit(from: @FungibleToken.Vault) {
            pre {
                !self.isEnded: "BOWL has ended"
                from.balance > 0.0: "deposit empty vault"
            }

            self.bowlVault.deposit(from: <- from)
        }

        pub fun end(receiver: &{FungibleToken.Receiver}) {
            self.isEnded = true
            self.isPaused = true
            emit BowlEnded(bowlID: self.bowlID, name: self.name, host: self.host)
            if self.bowlVault.balance > 0.0 {
                let v <- self.bowlVault.withdraw(amount: self.bowlVault.balance)
                receiver.deposit(from: <- v)
            }
        }

        init(
            name: String,
            description: String,
            host: Address,
            image: String?,
            url: String?,
            startAt: UFix64?,
            endAt: UFix64?,
            registrationEndAt: UFix64, 
            tokenInfo: TokenInfo,
            wagerAmount: UFix64,
            wagerOptions: String,
            vault: @FungibleToken.Vault,
            registrationVerifyMode: EligibilityVerifiers.VerifyMode,
            claimVerifyMode: EligibilityVerifiers.VerifyMode,
            registrationVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]},
            claimVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]},
            extraData: {String: AnyStruct} 
        ) {
            pre {
                name.length > 0: "invalid name"
            }

            // `tokenInfo` should match with `vault`
            let tokenVaultType = CompositeType(tokenInfo.providerIdentifier)!
            if !vault.isInstance(tokenVaultType) {
                panic("invalid token info: get ".concat(vault.getType().identifier)
                .concat(", want ").concat(tokenVaultType.identifier))
            }

            if let _startAt = startAt {
                if let _endAt = endAt {
                    assert(_startAt < _endAt, message: "endAt should greater than startAt")
                    assert(registrationEndAt < _endAt, message: "registrationEndAt should smaller than endAt")
                }
                assert(registrationEndAt > _startAt, message: "registrationEndAt should greater than startAt")
            }

            self.bowlID = self.uuid
            self.name = name
            self.description = description
            self.createdAt = getCurrentBlock().timestamp
            self.host = host
            self.image = image
            self.url = url

            self.startAt = startAt
            self.endAt = endAt

            self.registrationEndAt = registrationEndAt

            self.tokenInfo = tokenInfo
            self.bowlVault <- vault

            self.wagerAmount = wagerAmount
            self.wagerOptions = wagerOptions
            self.wagerOptionFinal = 0

            self.registrationVerifyMode = registrationVerifyMode
            self.claimVerifyMode = claimVerifyMode
            self.registrationVerifiers = registrationVerifiers
            self.claimVerifiers = claimVerifiers

            self.extraData = extraData

            self.isPaused = false
            self.isEnded = false

            self.registrationRecords = {}
            self.candidates = []
            self.winners = {}

            Fruit.totalBowls = Fruit.totalBowls + 1
            emit BowlCreated(
                bowlID: self.bowlID, 
                name: self.name, 
                host: self.host, 
                description: self.description, 
                tokenIdentifier: self.tokenInfo.tokenIdentifier
            )
        }

        destroy() {
            pre {
                self.bowlVault.balance == 0.0: "bowlVault is not empty, please withdraw all funds before delete BOWL"
            }

            destroy self.bowlVault
            emit BowlDestroyed(bowlID: self.bowlID, name: self.name, host: self.host)
        }
    }

    pub resource interface IFruitPauser {
        pub fun toggleContractPause(): Bool
    }

    pub resource Admin: IFruitPauser {
        // Use to pause the creation of new BOWL
        // If we want to migrate the contracts, we can make sure no more Bowl in old contracts be created.
        pub fun toggleContractPause(): Bool {
            Fruit.isPaused = !Fruit.isPaused
            return Fruit.isPaused
        }
    }

    pub resource interface IBowlCollectionPublic {
        pub fun getAllBowls(): {UInt64: &{IBowlPublic}}
        pub fun borrowPublicBowlRef(bowlID: UInt64): &{IBowlPublic}?
    }

    pub resource BowlCollection: IBowlCollectionPublic {
        pub var bowls: @{UInt64: Bowl}

        pub fun createBowl(
            name: String,
            description: String,
            host: Address,
            image: String?,
            url: String?,
            startAt: UFix64?,
            endAt: UFix64?,
            registrationEndAt: UFix64, 
            tokenInfo: TokenInfo,
            wagerAmount: UFix64,
            wagerOptions: String,
            vault: @FungibleToken.Vault,
            registrationVerifyMode: EligibilityVerifiers.VerifyMode,
            claimVerifyMode: EligibilityVerifiers.VerifyMode,
            registrationVerifiers: [{EligibilityVerifiers.IEligibilityVerifier}],
            claimVerifiers: [{EligibilityVerifiers.IEligibilityVerifier}],
            extraData: {String: AnyStruct} 
        ): UInt64 {
            pre {
                registrationVerifiers.length <= 1: "Currently only 0 or 1 registration verifier supported"
                claimVerifiers.length <= 1: "Currently only 0 or 1 registration verifier supported"
                !Fruit.isPaused: "Fruit contract is paused!"
            }

            let typedRegistrationVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]} = {}
            for verifier in registrationVerifiers {
                let identifier = verifier.getType().identifier
                if typedRegistrationVerifiers[identifier] == nil {
                    typedRegistrationVerifiers[identifier] = [verifier]
                } else {
                    typedRegistrationVerifiers[identifier]!.append(verifier)
                }
            }

            let typedClaimVerifiers: {String: [{EligibilityVerifiers.IEligibilityVerifier}]} = {}
            for verifier in claimVerifiers {
                let identifier = verifier.getType().identifier
                if typedClaimVerifiers[identifier] == nil {
                    typedClaimVerifiers[identifier] = [verifier]
                } else {
                    typedClaimVerifiers[identifier]!.append(verifier)
                }
            }

            let bowl <- create Bowl(
                name: name,
                description: description,
                host: host,
                image: image,
                url: url,
                startAt: startAt,
                endAt: endAt,
                registrationEndAt: registrationEndAt,
                tokenInfo: tokenInfo,
                wagerAmount: wagerAmount,
                wagerOptions: wagerOptions,
                vault: <- vault,
                registrationVerifyMode: registrationVerifyMode,
                claimVerifyMode: claimVerifyMode,
                registrationVerifiers: typedRegistrationVerifiers,
                claimVerifiers: typedClaimVerifiers,
                extraData: extraData
            )

            let bowlID = bowl.bowlID

            self.bowls[bowlID] <-! bowl
            return bowlID
        }

        pub fun getAllBowls(): {UInt64: &{IBowlPublic}} {
            let bowlRefs: {UInt64: &{IBowlPublic}} = {}

            for bowlID in self.bowls.keys {
                let bowlRef = (&self.bowls[bowlID] as &{IBowlPublic}?)!
                bowlRefs.insert(key: bowlID, bowlRef)
            }

            return bowlRefs
        }

        pub fun borrowPublicBowlRef(bowlID: UInt64): &{IBowlPublic}? {
            return &self.bowls[bowlID] as &{IBowlPublic}?
        }

        pub fun borrowBowlRef(bowlID: UInt64): &Bowl? {
            return &self.bowls[bowlID] as &Bowl?
        }

        pub fun deleteBowl(bowlID: UInt64, receiver: &{FungibleToken.Receiver}) {
            // Clean the Bowl before make it ownerless
            let bowlRef = self.borrowBowlRef(bowlID: bowlID) ?? panic("This bowl does not exist")
            bowlRef.end(receiver: receiver)
            let bowl <- self.bowls.remove(key: bowlID) ?? panic("This bowl does not exist")
            destroy bowl
        }

        init() {
            self.bowls <- {}
        }

        destroy() {
            destroy self.bowls
        }
    }

    pub fun createEmptyBowlCollection(): @BowlCollection {
        return <- create BowlCollection()
    }

    pub var isPaused: Bool
    pub var totalBowls: UInt64

    init() {
        self.BowlCollectionStoragePath = /storage/fruitBowlCollection
        self.BowlCollectionPublicPath = /public/fruitBowlCollection
        self.BowlCollectionPrivatePath = /private/fruitBowlCollection

        self.FruitAdminStoragePath = /storage/fruitFruitAdmin
        self.FruitAdminPublicPath = /public/fruitFruitAdmin
        self.FruitAdminPrivatePath = /private/fruitFruitAdmin

        self.isPaused = false
        self.totalBowls = 0

        self.account.save(<- create Admin(), to: self.FruitAdminStoragePath)

        emit ContractInitialized()
    }
}
