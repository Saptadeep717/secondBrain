
interface TagData{
    text:string,
    key:number|string
}
const TagElement = ({text,key}:TagData) => {
  return (
    <div className="bg-purple-600 p-1 px-3 text-purple-200 rounded-xl text-xs font-semibold italic" key={key}>{text}</div>
  )
}

export default TagElement