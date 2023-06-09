# Fruit Bowl

## What’s Fruit Bowl?

A fun social defi project for friendly wagers among friends for future outcomes; leveraging power of escrow vaults, on-chain transparency, tokens, and code-is-law agreements.

Test your intuition with your friends, win some tokens or win some excitement (even if your intuition is wrong).

Management of wagers and distribution of prizes are powered by FLOW's Cadence smart contract.

## How is it built?

refer to `src/cadence` for contracts

contracts are deployed to this account on Testnet
https://f.dnz.dev/0x0fbbe25ef97bb64e/Fruit

refer to `src/ui` for frontend website built with NextJS

run `yarn dev` to run the UI

## So, what’s a BOWL?

A BOWL is where users come to put their wagers and stand by their picks.

At the end of a BOWL, the host or a quorum of judges will decide upon a winning pick.

Those users who made the right pick share all the tokens wagered in the BOWL vault equally.

## How to create a BOWL?

There are 3 main stages of a BOWL

- host starts a BOWL, sets entry eligibility (whitelist, ownership of certain NFTs), then sets entry fee, potential picks for participants to pick
- participants pay the entry fee (which goes into the BOWL vault), then decide on picks
- host or a panel of judges decide the winning pick, the vault is then split equally among the winning participants

To decide who is eligible for your BOWL, you can check **[here](#who-is-eligible)**.

## Who is eligible?

In Fruit Bowl, you can decide who is eligible for your rewards by using our different modes.

- Whitelist. You can upload a whitelist. Only accounts on the whitelist are eligible for rewards.
- **[FLOAT Event](https://floats.city)**. You can limit the eligibility to people who own FLOATs of specific FLOAT Event at the time of the DROP or NFT Raffle being created.
- **[FLOAT Group](https://floats.city)**. You can also limit the eligibility to people who own FLOATs in a FLOAT Group. You can set a threshold to the number of FLOATs the users should have.

## Credit

This project is inspired by and built upon Drizzle.
Thanks for creating a holistic project for new comers to learn from and extend.

Fruit Bowl is a reverse version of a mashup of DROP and RAFFLE.
Participants register their pick and pay wagers.
Winning participants split the vault equally
