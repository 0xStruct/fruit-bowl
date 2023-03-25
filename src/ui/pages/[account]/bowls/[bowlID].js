import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { SpinnerCircular } from 'spinners-react'

import Custom404 from '../../404'
import { queryBowl, queryClaimStatus } from '../../../lib/fruit-scripts'
import BowlPresenter from '../../../components/bowl/BowlPresenter'
import { queryAddressesOfDomains, queryDefaultDomainsOfAddresses } from '../../../lib/scripts'
import { isValidFlowAddress } from '../../../lib/utils'

const bowlFetcher = async (funcName, bowlID, host) => {
  const bowl = await queryBowl(bowlID, host)
  const hostDomains = await queryDefaultDomainsOfAddresses([host])
  bowl.host = {address: host, domains: hostDomains[host]}
  const winnerAddresses = Object.keys(bowl.winners)
  const domains = await queryDefaultDomainsOfAddresses(winnerAddresses)
  const winners = {}
  for (let [address, record] of Object.entries(bowl.winners)) {
    let r = Object.assign({}, record)
    r.domains = domains[address]
    winners[address] = r
  }
  bowl.winners = winners
  return bowl
}

const bowlClaimStatusFetcher = async (funcName, bowlID, host, claimer) => {
  return await queryClaimStatus(bowlID, host, claimer)
}

export default function Bowl(props) {
  const router = useRouter()
  const { account, bowlID } = router.query
  const [host, setHost] = useState(null)

  useEffect(() => {
    if (account) {
      if (isValidFlowAddress(account)) {
        setHost(account)
      } else {
        queryAddressesOfDomains([account]).then((result) => {
          if (result[account]) {
            setHost(result[account])
          } else {
            // trigger 400 page
            setHost(account)
          }
        }).catch(console.error)
      }
    }
  }, [account])

  const user = props.user

  const [bowl, setBowl] = useState(null)
  const [claimStatus, setClaimStatus] = useState(null)

  useEffect(() => {
    console.log(bowl);
  }, [bowl])

  const { data: bowlData, error: bowlError } = useSWR(
    bowlID && host ? ["bowlFetcher", bowlID, host] : null, bowlFetcher)

  const { data: claimStatusData, error: claimStatusError } = useSWR(
    bowlID && host && user && user.loggedIn ? ["bowlClaimStatusFetcher", bowlID, host, user.addr] : null, bowlClaimStatusFetcher)

  useEffect(() => {
    if (bowlData) { setBowl(bowlData) }
    if (claimStatusData) { setClaimStatus(claimStatusData) }
  }, [bowlData, claimStatusData])

  if (bowlError && bowlError.statusCode === 400) {
    return <Custom404 title={"Bowl may not exist or deleted"} />
  }

  return (
    <>
      <div className="container mx-auto max-w-[920px] min-w-[380px] px-6">
        {
          bowl ?
            <BowlPresenter
              raffle={bowl}
              claimStatus={claimStatus}
              user={user}
              host={host}
            /> :
            <div className="flex h-[200px] mt-10 justify-center">
              <SpinnerCircular size={50} thickness={180} speed={100} color="#00d588" secondaryColor="#e2e8f0" />
            </div>
        }
      </div>
    </>
  )
}