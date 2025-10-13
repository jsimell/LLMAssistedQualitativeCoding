const InfoBox = ({ msg, icon: Icon, variant="neutral" }) => {
  const variants = {
    neutral: "bg-gray-300 text-gray-800 border-gray-800",
    error: "bg-red-300 text-red-800 border-red-800",
    success: "bg-green-300 text-green-800 border-green-800"
  }

  return (
    <div className={`flex gap-3 items-center justify-center py-2 pl-6 pr-8 rounded-xl border ${variants[variant]}`}>
      <Icon className="size-10"></Icon>
      <span>{msg}</span>
    </div>
  );
}

export default InfoBox;