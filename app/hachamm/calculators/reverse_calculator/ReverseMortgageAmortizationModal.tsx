"use client";

type Props = {
  open:boolean;
  onClose:()=>void;
  title:string;
  children:React.ReactNode;
};


export default function ReverseMortgageAmortizationModal({
open,
onClose,
title,
children
}:Props){


if(!open) return null;


return (

<div className="
fixed
inset-0
z-50
flex
items-center
justify-center
bg-black/50
p-4
">


<div className="
bg-white
w-full
max-w-4xl
rounded-2xl
shadow-2xl
max-h-[90vh]
overflow-hidden
">


<div className="
flex
justify-between
items-center
p-4
bg-[#1d75a1]
text-white
">


<h2 className="font-bold text-xl">
{title}
</h2>


<button
onClick={onClose}
className="text-2xl"
>
×
</button>


</div>



<div className="
p-4
overflow-auto
max-h-[75vh]
">

{children}

</div>


</div>


</div>

)

}