"use client";

import { useMemo, useState } from "react";


type Loan = {
  name:string;
  balance:string;
  payment:string;
  interest:string;
  months:string;
};


export default function LoanConsolidationModal(){

const [loans,setLoans] = useState<Loan[]>([
 {
  name:"",
  balance:"",
  payment:"",
  interest:"",
  months:""
 }
]);


const [newMonths,setNewMonths]=useState(240);
const [newInterest,setNewInterest]=useState(5.2);



const format=(v:string)=>
 v.replace(/\D/g,"")
 .replace(/\B(?=(\d{3})+(?!\d))/g,",");


const parse=(v:string)=>
 Number(v.replace(/,/g,"")||0);



const updateLoan=(i:number,key:keyof Loan,value:string)=>{

const copy=[...loans];

copy[i]={
 ...copy[i],
 [key]:value
};

setLoans(copy);

};



const totalBalance = useMemo(()=>{

return loans.reduce(
(sum,l)=>sum+parse(l.balance),0
)

},[loans]);



const oldPayment = useMemo(()=>{

return loans.reduce(
(sum,l)=>sum+parse(l.payment),0
)

},[loans]);



// שפיצר

const newPayment = useMemo(()=>{


const amount=totalBalance;

const r=newInterest/100/12;


if(!amount) return 0;


return amount*
(
r /
(1-Math.pow(1+r,-newMonths))
);


},[totalBalance,newInterest,newMonths]);



const saving =
oldPayment-newPayment;



return (

<div className="
bg-white
rounded-2xl
shadow-lg
p-4
space-y-4
text-sm
">


<h3 className="font-bold text-lg text-gray-800">
בדיקת איחוד הלוואות
</h3>



{/* הלוואות קיימות */}

<div>

<div className="font-semibold mb-2">
הלוואות קיימות
</div>


<div className="
overflow-x-auto
border
rounded-xl
">


<table className="w-full text-xs">


<thead className="bg-gray-50">

<tr>

<th>הלוואה</th>
<th>יתרה</th>
<th>החזר</th>
<th>ריבית</th>
<th>חודשים</th>

</tr>

</thead>


<tbody>

{loans.map((l,i)=>(

<tr key={i}>


<td>
<input
value={l.name}
onChange={
e=>updateLoan(i,"name",e.target.value)
}
className="input"
/>
</td>


<td>
<input
value={l.balance}
onChange={
e=>updateLoan(i,"balance",format(e.target.value))
}
className="input"
/>
</td>


<td>
<input
value={l.payment}
onChange={
e=>updateLoan(i,"payment",format(e.target.value))
}
className="input"
/>
</td>


<td>
<input
value={l.interest}
onChange={
e=>updateLoan(i,"interest",e.target.value)
}
className="input"
/>
</td>


<td>
<input
value={l.months}
onChange={
e=>updateLoan(i,"months",e.target.value)
}
className="input"
/>
</td>


</tr>

))}


</tbody>

</table>

</div>


<button

onClick={()=>setLoans([
...loans,
{
name:"",
balance:"",
payment:"",
interest:"",
months:""
}
])}

className="
mt-2
text-xs
text-green-700
font-bold
"

>
+ הוסף הלוואה
</button>


</div>




{/* תמהיל חדש */}

<div>

<div className="font-semibold mb-2">
תמהיל כל מטרה חדש
</div>


<div className="
grid
grid-cols-3
gap-2
">


<div>
<label>סכום</label>
<div className="border rounded p-2">
{totalBalance.toLocaleString()} ₪
</div>
</div>


<div>

<label>חודשים</label>

<input
type="number"
value={newMonths}
onChange={e=>setNewMonths(+e.target.value)}
className="input"
/>

</div>



<div>

<label>ריבית</label>

<input
value={newInterest}
onChange={e=>setNewInterest(+e.target.value)}
className="input"
/>

</div>


</div>

</div>




{/* סיכום */}

<div className="
grid grid-cols-3 gap-2
">


<div className="box">
החזר היום
<br/>
<b>
{oldPayment.toLocaleString()} ₪
</b>
</div>



<div className="box">

החזר חדש

<br/>

<b>
{Math.round(newPayment).toLocaleString()} ₪
</b>

</div>



<div className="
box
bg-green-50
">

חיסכון

<br/>

<b className="text-green-700">

{Math.round(saving).toLocaleString()} ₪

</b>

</div>



</div>


</div>

)

}