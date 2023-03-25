pub contract FruitRecorder {

    pub let RecorderStoragePath: StoragePath
    pub let RecorderPublicPath: PublicPath
    pub let RecorderPrivatePath: PrivatePath

    pub event ContractInitialized()

    pub event RecordInserted(recorder: Address, type: String, uuid: UInt64, host: Address)
    pub event RecordUpdated(recorder: Address, type: String, uuid: UInt64, host: Address)
    pub event RecordRemoved(recorder: Address, type: String, uuid: UInt64, host: Address)

    // @struct claimedAmount is the winning amount eligible to claim
    pub struct FruitBowl {
        pub let bowlID: UInt64
        pub let host: Address
        pub let name: String
        pub let tokenSymbol: String
        pub let registeredAt: UFix64
        pub var claimedAmount: UFix64
        pub var claimedAt: UFix64?
        pub let extraData: {String: AnyStruct}

        init(
            bowlID: UInt64,
            host: Address,
            name: String,
            tokenSymbol: String,
            registeredAt: UFix64,
            extraData: {String: AnyStruct}
        ) {
            self.bowlID = bowlID
            self.host = host
            self.name = name
            self.tokenSymbol = tokenSymbol
            self.registeredAt = registeredAt
            self.claimedAmount = 0.0
            self.claimedAt = nil
            self.extraData = extraData
        }

        pub fun markAsClaimed(claimedAmount: UFix64, extraData: {String: AnyStruct}) {
            assert(self.claimedAt == nil, message: "Already marked as Claimed")
            self.claimedAmount = claimedAmount
            self.claimedAt = getCurrentBlock().timestamp
            for key in extraData.keys {
                if !self.extraData.containsKey(key) {
                    self.extraData[key] = extraData[key]
                }
            }
        }
    }

    pub resource interface IRecorderPublic {
        pub fun getRecords(): {String: {UInt64: AnyStruct}}
        pub fun getRecordsByType(_ type: Type): {UInt64: AnyStruct}
        pub fun getRecord(type: Type, uuid: UInt64): AnyStruct?
    }

    pub resource Recorder: IRecorderPublic {
        pub let records: {String: {UInt64: AnyStruct}}

        pub fun getRecords(): {String: {UInt64: AnyStruct}} {
            return self.records
        }

        pub fun getRecordsByType(_ type: Type): {UInt64: AnyStruct} {
            self.initTypeRecords(type: type)
            return self.records[type.identifier]!
        }

        pub fun getRecord(type: Type, uuid: UInt64): AnyStruct? {
            self.initTypeRecords(type: type)
            return self.records[type.identifier]![uuid]
        }

        pub fun insertOrUpdateRecord(_ record: AnyStruct) {
            let type = record.getType()
            self.initTypeRecords(type: type)

            if record.isInstance(Type<FruitBowl>()) {
                let bowlInfo = record as! FruitBowl
                let oldValue = self.records[type.identifier]!.insert(key: bowlInfo.bowlID, bowlInfo)

                if oldValue == nil {
                    emit RecordInserted(
                        recorder: self.owner!.address,
                        type: type.identifier,
                        uuid: bowlInfo.bowlID,
                        host: bowlInfo.host
                    )
                } else {
                    emit RecordUpdated(
                        recorder: self.owner!.address,
                        type: type.identifier,
                        uuid: bowlInfo.bowlID,
                        host: bowlInfo.host
                    )
                }

            } else {
                panic("Invalid record type")
            }
        }

        pub fun removeRecord(_ record: AnyStruct) {
            let type = record.getType()
            self.initTypeRecords(type: type)

            if record.isInstance(Type<FruitBowl>()) {
                let bowlInfo = record as! FruitBowl
                self.records[type.identifier]!.remove(key: bowlInfo.bowlID)

                emit RecordRemoved(
                    recorder: self.owner!.address,
                    type: type.identifier,
                    uuid: bowlInfo.bowlID,
                    host: bowlInfo.host
                )
            } else {
                panic("Invalid record type")
            }
        }

        access(self) fun initTypeRecords(type: Type) {
            assert(type == Type<FruitBowl>(), message: "Invalid Type")
            if self.records[type.identifier] == nil {
                self.records[type.identifier] = {}
            }
        }

        init() {
            self.records = {}
        }

        destroy() {}
    }

    pub fun createEmptyRecorder(): @Recorder {
        return <- create Recorder()
    }

    init() {
        self.RecorderStoragePath = /storage/fruitRecorder
        self.RecorderPublicPath = /public/fruitRecorder
        self.RecorderPrivatePath = /private/fruitRecorder

        emit ContractInitialized()
    }
}
