import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import * as fcl from "@onflow/fcl"
import Decimal from 'decimal.js'

import TokenSelector from './TokenSelector'
import BowlCard from './BowlCard'

import { classNames, floatEventInputHandler, floatGroupInputHandler, getTimezone, isValidHttpUrl } from '../../lib/utils'

import { useRecoilState } from "recoil"
import {
  basicNotificationContentState,
  showBasicNotificationState,
  transactionInProgressState,
  transactionStatusState
} from "../../lib/atoms"
import EligibilityModeSelector, {
  EligibilityModeFLOAT,
  EligibilityModeFLOATGroup,
  EligibilityModeWhitelist
} from '../eligibility/EligibilityModeSelector'
import FloatReviewer from '../eligibility/FloatReviewer'
import BasicInfoBoard from '../common/BasicInfoBoard'
import Hints from '../../lib/hints'
import WhitelistReviewer from '../eligibility/WhitelistReviewer'
import CreatedModal from '../common/CreatedModal'
import publicConfig from '../../publicConfig'
//import NFTSelector from './NFTSelector'
//import { createRaffle } from '../../lib/mist-transactions'
import { createBowl } from '../../lib/fruit-transactions'
import BowlStatsCard from './BowlStatsCard'
//import RewardCard from './RewardCard'

const NamePlaceholder = "BOWL name"
const DescriptionPlaceholder = "Detailed information about this BOWL"
const OptionsPlaceholder = "Option #1\nOption #2\nOption #3"
const HostPlaceholder = "0x0042"
const CreatedAtPlaceholder = new Date('2023-03-15T08:16:16Z')
const Timezone = getTimezone()

/*export const convertSelectTokensToDisplays = (selectedTokens) => {
  const displays = {}
  for (const [tokenID, token] of Object.entries(selectedTokens)) {
    if (token.isSelected) displays[tokenID] = token.display
  }
  return displays
}*/

export default function BowlCreator(props) {
  const router = useRouter()
  const { float, float_group } = router.query

  const [, setShowBasicNotification] = useRecoilState(showBasicNotificationState)
  const [, setBasicNotificationContent] = useRecoilState(basicNotificationContentState)
  const [transactionInProgress, setTransactionInProgress] = useRecoilState(transactionInProgressState)
  const [transactionStatus, setTransactionStatus] = useRecoilState(transactionStatusState)

  const [banner, setBanner] = useState(null)
  const [bannerSize, setBannerSize] = useState(0)

  const [name, setName] = useState(null)
  const [url, setURL] = useState(null)
  const [description, setDescription] = useState(null)

  const [token, setToken] = useState(null)
  const [tokenBalance, setTokenBalance] = useState(new Decimal(0))
  const [wagerAmount, setWagerAmount] = useState(1)
  const [wagerOptions, setWagerOptions] = useState("")

  const [timeLockEnabled, setTimeLockEnabled] = useState(false)
  const [startAt, setStartAt] = useState(null)
  const [endAt, setEndAt] = useState(null)

  const [eligibilityMode, setEligibilityMode] = useState(null)

  // For Whitelist
  const [whitelistReviewerCallback, setWhitelistReviewerCallback] = useState(null)

  // For Float
  const [floatEvents, setFloatEvents] = useState([])
  // [{eventID: xxx, eventHost: xxx}]
  const [floatEventPairs, setFloatEventPairs] = useState([])
  // {groupName: xxx, groupHost: xxx}
  const [floatGroup, setFloatGroup] = useState(null)
  const [threshold, setThreshold] = useState('')

  const [showPreview, setShowPreview] = useState(false)

  const [showCreatedModal, setShowCreatedModal] = useState(false)
  const [newRaffleURL, setNewRaffleURL] = useState(null)

  const [timezone, setTimezone] = useState(null)
  const [registrationDeadline, setRegistrationDeadline] = useState(null)
  //const [numberOfWinners, setNumberOfWinners] = useState('')

  //const [selectedNFT, setSelectedNFT] = useState(null)
  //const [selectedTokens, setSelectedTokens] = useState({})

  useEffect(() => {
    setTimezone(Timezone)
  }, [timezone])

  useEffect(() => {
    if (float && float.trim() != '') {
      floatEventInputHandler(float).then((eventPairs) => {
        setFloatEventPairs(eventPairs)
        setEligibilityMode(EligibilityModeFLOAT)
      }).catch(console.error)
    }

    if (float_group && float_group.trim() != '') {
      floatGroupInputHandler(float_group).then((group) => {
        setFloatGroup(group)
        setEligibilityMode(EligibilityModeFLOATGroup)
      })
    }
  }, [float, float_group])

  const checkBasicParams = () => {
    if (!name || name.trim() == "") {
      return [false, Hints.InvalidName]
    }

    if (url && !isValidHttpUrl(url)) {
      return [false, Hints.InvalidURL]
    }

    /*if (!selectedNFT) {
      return [false, Hints.InvalidNFT]
    }*/
    // check token and wagerAmount


    if (bannerSize > publicConfig.bannerSizeLimit) {
      return [false, Hints.BannerOversize]
    }

    if (endAt && isFinite(endAt) && endAt.getTime() < (new Date()).getTime()) {
      return [false, Hints.RaffleEnded]
    }

    if (startAt && isFinite(startAt) && endAt && startAt.getTime() >= endAt.getTime()) {
      return [false, Hints.InvalidTimeLimit]
    }

    if (!registrationDeadline || 
      !isFinite(registrationDeadline) || 
      registrationDeadline.getTime() < (new Date()).getTime() ||
      (endAt && isFinite(endAt) && registrationDeadline.getTime() >= endAt.getTime()) ||
      (startAt && isFinite(startAt) && registrationDeadline.getTime() <= startAt.getTime())
      ) {
        return [false, Hints.InvalidRegistrationDeadline]
    }


    /*if (!numberOfWinners || isNaN(parseInt(numberOfWinners))) {
      return [false, Hints.InvalidNumberOfWinners]
    }

    const _numberOfWinners = new Decimal(numberOfWinners)
    if (!(_numberOfWinners.isInteger() && _numberOfWinners.toNumber() >= 1)) {
      return [false, Hints.InvalidNumberOfWinners]
    }

    const numberOfNFTs = Object.values(selectedTokens).filter((info) => info.isSelected).length
    if (numberOfNFTs < numberOfWinners) {
      return [false, Hints.InsufficientNFTs]
    }*/

    return [true, null]
  }

  const checkEligibilityParams = () => {
    if (eligibilityMode.key === EligibilityModeFLOATGroup.key) {
      return EligibilityModeFLOATGroup.checkRaffleParams(
        floatEvents, threshold
      )
    }

    if (eligibilityMode.key === EligibilityModeFLOAT.key) {
      return EligibilityModeFLOAT.checkRaffleParams(
        floatEvents, threshold
      )
    }

    if (eligibilityMode.key === EligibilityModeWhitelist.key) {
      return EligibilityModeWhitelist.checkRaffleParams(
        whitelistReviewerCallback
      )
    }
  }

  const handleSubmit = async (event) => {
    if (!(props.user && props.user.loggedIn)) {
      fcl.authenticate()
      return
    }

    setShowBasicNotification(false)

    const [isBasicParamsValid, basicError] = checkBasicParams()
    if (!isBasicParamsValid) {
      setShowBasicNotification(true)
      setBasicNotificationContent({ type: "exclamation", title: "Invalid Params", detail: basicError })
      return
    }

    const [isEligibilityParamsValid, eligibilityError] = checkEligibilityParams()
    if (!isEligibilityParamsValid) {
      setShowBasicNotification(true)
      setBasicNotificationContent({ type: "exclamation", title: "Invalid Params", detail: eligibilityError })
      return
    }

    if (!showPreview) {
      setShowPreview(true)
      return
    }

    /*const rewardTokenIDs = Object.entries(selectedTokens)
      .filter(([, info]) => info.isSelected)
      .map(([tokenID,]) => tokenID)*/

    const params = {
      name: name,
      description: description ?? '',
      image: banner,
      url: url,
      startAt: startAt && isFinite(startAt) ? `${startAt.getTime() / 1000}.0` : null,
      endAt: endAt && isFinite(endAt) ? `${endAt.getTime() / 1000}.0` : null,
      registrationEndAt: `${registrationDeadline.getTime() / 1000}.0`,
      token: token,
      wagerAmount: wagerAmount,
      wagerOptions: wagerOptions,
      withWhitelist: false,
      whitelist: [],
      withFloats: false,
      threshold: null,
      eventIDs: [],
      eventHosts: [],
      withFloatGroup: false,
      floatGroupName: null,
      floatGroupHost: null
    }

    if (eligibilityMode.key === EligibilityModeWhitelist.key) {
      const { whitelist, } = whitelistReviewerCallback
      params.withWhitelist = true
      params.whitelist = whitelist

    } else if (eligibilityMode.key === EligibilityModeFLOAT.key) {
      // Only support 1 event now
      let eventIDs = [floatEventPairs[0].eventID]
      let eventHosts = [floatEventPairs[0].eventHost]

      params.withFloats = true
      params.threshold = `${eventIDs.length}`
      params.eventIDs = eventIDs
      params.eventHosts = eventHosts

    } else if (eligibilityMode.key === EligibilityModeFLOATGroup.key) {
      params.withFloatGroup = true
      params.threshold = threshold
      params.floatGroupName = floatGroup.groupName
      params.floatGroupHost = floatGroup.groupHost
    }

    const args = Object.values(params)
    const res = await createBowl(...args,
      setTransactionInProgress, setTransactionStatus
    )
    handleCreationResponse(res)
  }

  const handleCreationResponse = (res) => {
    if (res && res.status === 4 && res.statusCode === 0) {
      const event = res.events.find((e) => e.data.bowlID)
      if (event) {
        const url = `${publicConfig.appURL}/${props.user && props.user.addr}/bowls/${event.data.bowlID}`
        setNewRaffleURL(url)
        setShowCreatedModal(true)
      }
    }
  }

  const showEligibilityModeInputs = (mode) => {
    if (!mode) { return null }

    if (mode.key === EligibilityModeWhitelist.key) {
      return (
        <WhitelistReviewer
          callback={setWhitelistReviewerCallback}
        />
      )
    }

    if (mode.key === EligibilityModeFLOAT.key || mode.key === EligibilityModeFLOATGroup.key) {
      return (
        <FloatReviewer
          floatMode={mode.detail}
          threshold={threshold} setThreshold={setThreshold}
          rawFloatInput={float || float_group}
          floatEvents={floatEvents}
          setFloatEvents={setFloatEvents}
          setFloatEventPairs={setFloatEventPairs}
          setFloatGroup={setFloatGroup}
        />
      )
    }

    return null
  }

  return (
    <>
      {/** title */}
      {showPreview ?
        <h1 className="font-flow font-semibold text-2xl sm:text-4xl text-center mb-10">
          PREVIEW BOWL
        </h1> :
        <h1 className="font-flow font-semibold text-2xl sm:text-4xl text-center mb-10">
          CREATE BOWL
        </h1>
      }

      {/** preview */}
      {showPreview ?
        <>
          <div className="flex justify-center mb-10">
            <BowlCard
              isPreview={true}
              banner={banner}
              name={(!name || name.length == 0) ? NamePlaceholder : name}
              url={url}
              host={props.user || HostPlaceholder}
              createdAt={CreatedAtPlaceholder}
              description={description ?? DescriptionPlaceholder}
              //nft={selectedNFT}
              token={token}
              wagerAmount={wagerAmount}
              wagerOptions={wagerOptions}
              timeLockEnabled={timeLockEnabled}
              startAt={startAt}
              endAt={endAt}
              registrationEndAt={registrationDeadline}
              eligibilityMode={eligibilityMode}
              floatGroup={floatGroup}
              floatEventPairs={floatEventPairs}
              threshold={threshold}
              //selectedTokens={selectedTokens}
            />
          </div>
          {/*<div className="flex flex-col items-center justify-center">
            <BowlStatsCard isPreview={true} draft={
              {
                nftInfo: selectedNFT,
                numberOfWinners: numberOfWinners
              }
            }/>
            <RewardCard isPreview={true} draft={
              {
                rewardDisplays: convertSelectTokensToDisplays(selectedTokens)
              }
            } />
          </div>*/}
        </>
        : null
      }

      <div className={`${showPreview ? 'hidden' : ''} flex flex-col gap-y-10 shadow-drizzle p-4 sm:p-8 rounded-3xl bg-white`}>
        <BasicInfoBoard
          banner={banner} setBanner={setBanner} setBannerSize={setBannerSize}
          setName={setName} setURL={setURL} setDescription={setDescription}
          timeLockEnabled={timeLockEnabled} setTimeLockEnabled={setTimeLockEnabled}
          setStartAt={setStartAt} setEndAt={setEndAt}
          NamePlaceholder={NamePlaceholder} DescriptionPlaceholder={DescriptionPlaceholder}
        />
        {/* wager options */}
        <div className="flex flex-col gap-y-10">
          <div className="flex flex-col gap-y-2">
            <label className="block text-2xl font-bold font-flow">
              Options<span className="text-red-600">*</span>
            </label>
            <label className="block text-md font-flow leading-6 mt-0 mb-0">
              Available options for participants to choose from
            </label>
            <div className="mt-1">
              <textarea
                rows={3}
                name="wagerOptions"
                id="wagerOptions"
                disabled={transactionInProgress}
                className="focus:ring-drizzle-green-dark focus:border-drizzle-green-dark rounded-2xl
                  bg-drizzle-green-ultralight resize-none block w-full border-drizzle-green font-flow text-lg placeholder:text-gray-400"

                defaultValue={wagerOptions}
                spellCheck={false}
                placeholder={OptionsPlaceholder}
                onChange={(event) => { setWagerOptions(event.target.value) }}
              />
            </div>
          </div>
        </div>

        <TokenSelector
          user={props.user}
          className="w-full"
          onTokenSelected={setToken}
          onWagerAmount={setWagerAmount}
          onBalanceFetched={setTokenBalance}
        />
        
        {/*<div className="flex flex-col">
          <label className="text-2xl font-bold font-flow">
            # of Winners<span className="text-red-600">*</span>
          </label>
          <label className="block text-md font-flow leading-6 mt-2 mb-2">
            The max number of winners to be drawn
          </label>
          <input
            type="number"
            disabled={transactionInProgress}
            min="1"
            // max={floatEvents.length}
            value={numberOfWinners}
            id="numberOfWinners"
            className="grow w-full rounded-2xl focus:ring-drizzle-green-dark focus:border-drizzle-green-dark bg-drizzle-green-ultralight border-drizzle-green font-flow text-lg placeholder:text-gray-400"
            onWheel={(e) => e.target.blur()}
            onChange={(event) => { setNumberOfWinners(event.target.value) }}
          />
        </div>*/}

        <div className="flex flex-col">
          <label className="text-2xl font-bold font-flow">
            {/*Registration Deadline{timezone ? ` (${timezone})` : ''}<span className="text-red-600">*</span>*/}
            Registration Deadline<span className="text-red-600">*</span>
          </label>
          <label className="block text-md font-flow leading-6 mt-2 mb-2">
            To be a participant, eligible accounts should register before this date
          </label>
          <input
            type="datetime-local"
            disabled={transactionInProgress}
            id="start_at"
            className="mt-1 rounded-2xl focus:ring-drizzle-green-dark focus:border-drizzle-green-dark bg-drizzle-green-ultralight block w-full border-drizzle-green font-flow text-lg placeholder:text-gray-400 min-w-[220px]"
            onChange={(e) => { setRegistrationDeadline(new Date(e.target.value)) }}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <label className="block text-2xl font-bold font-flow">
            Registration Eligibility<span className="text-red-600">*</span>
          </label>
          <EligibilityModeSelector type="RAFFLE" mode={eligibilityMode} setMode={setEligibilityMode} />
        </div>

        {showEligibilityModeInputs(eligibilityMode)}

        {/*<NFTSelector
          user={props.user}
          selectedNFT={selectedNFT}
          setSelectedNFT={setSelectedNFT}
          selectedTokens={selectedTokens}
          setSelectedTokens={setSelectedTokens}
      />*/}
      </div>

      {/** create button */}
      <div className="w-full mt-16 flex flex-col gap-y-5 sm:flex-row sm:justify-between sm:gap-x-10 items-center">
        {showPreview ?
          <button
            type="button"
            className={classNames(
              transactionInProgress ? "bg-drizzle-green-light" : "bg-drizzle-green hover:bg-drizzle-green-dark",
              "w-full h-[60px] text-xl font-semibold rounded-3xl text-black shadow-drizzle"
            )}
            disabled={transactionInProgress}
            onClick={() => {
              setShowPreview(false)
            }}
          >
            BACK
          </button> : null
        }
        <button
          type="button"
          className={classNames(
            (transactionInProgress || !eligibilityMode) ? "bg-drizzle-green-light" : "bg-drizzle-green hover:bg-drizzle-green-dark",
            "w-full h-[60px] text-xl font-semibold rounded-3xl text-black shadow-drizzle"
          )}
          disabled={transactionInProgress || !eligibilityMode}
          onClick={() => {
            handleSubmit()
          }}
        >
          {props.user.loggedIn ?
            (eligibilityMode ?
              (!showPreview ? "PREVIEW" : "CREATE")
              : "Select a mode") : "Connect Wallet"}
        </button>
      </div>
      <CreatedModal type="Raffle" open={showCreatedModal} setOpen={setShowCreatedModal} url={newRaffleURL} />
    </>
  )
}