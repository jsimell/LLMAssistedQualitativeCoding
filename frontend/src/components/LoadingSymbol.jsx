const LoadingSymbol = ({ sizeClass, borderColorClass, borderTopColorClass }) => {
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClass} border-3 ${borderColorClass} ${borderTopColorClass} rounded-full animate-spin`}></div>
    </div>
  )
}

export default LoadingSymbol;
