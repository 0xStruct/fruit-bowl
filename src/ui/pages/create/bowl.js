import BowlCreator from '../../components/bowl/BowlCreator'

export default function NewRaffle(props) {
  return (
    <>
      <div className="container mx-auto max-w-[920px] min-w-[380px] px-6">
        <BowlCreator user={props.user} />
      </div>
    </>
  )
}