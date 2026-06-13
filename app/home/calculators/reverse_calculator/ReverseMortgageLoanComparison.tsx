"use client";

import { useMemo, useState } from "react";


type Props = {
  maxLoan: number;
  interestRate?: number;
  indexRate?: number;
  months?: number;
};



export default function ReverseMortgageLoanComparison({

maxLoan,
interestRate = 0,
indexRate = 0,
months = 360

}:Props){



const [loanAmount,setLoanAmount] =
useState(maxLoan);


const calc = useMemo(()=>{


const loan = Number(loanAmount) || 0;


const yearlyInterest =
interestRate / 100;


const yearlyIndex =
indexRate / 100;



const monthlyInterest =
Math.pow(
1 + yearlyInterest,
1/12
)-1;



const monthlyIndex =
Math.pow(
1 + yearlyIndex,
1/12
)-1;



/*
====================
בלון מלא
קרן + ריבית + מדד נדחים
====================
*/


let balloonBalance = loan;


let balloonInterest = 0;
let balloonIndex = 0;



for(let i=0;i<months;i++){


const beforeIndex =
balloonBalance;


const interest =
beforeIndex *
monthlyInterest;



balloonBalance += interest;


balloonInterest += interest;



const index =
balloonBalance *
monthlyIndex;



balloonBalance += index;


balloonIndex += index;


}



const balloonCost =
balloonInterest +
balloonIndex;







/*
====================
גרייס
ריבית בלבד
====================
*/


let graceBalance = loan;


let totalInterest = 0;
let totalIndex = 0;



for(let i=0;i<months;i++){


const interest =
graceBalance *
monthlyInterest;



totalInterest += interest;



const index =
graceBalance *
monthlyIndex;



totalIndex += index;



graceBalance += index;


}



const graceMonthly =
loan *
monthlyInterest;



return {


balloon:{

monthly:0,

total:
balloonBalance,

interest:
balloonInterest,

index:
balloonIndex,

cost:
balloonCost

},



grace:{

monthly:
graceMonthly,

total:
graceBalance,

interest:
totalInterest,

index:
totalIndex,

cost:
totalInterest + totalIndex

}


}



},[
loanAmount,
interestRate,
indexRate,
months
]);




return (


<div className="
w-full
bg-white
rounded-xl
shadow-inner
p-5
text-gray-900
space-y-5
">



<div>


<label className="font-bold">

סכום משכנתא מבוקשת

</label>


<input

type="number"

className="
w-full
mt-2
rounded-md
p-3
border
focus:ring-2
focus:ring-orange-300
"

value={loanAmount}

max={maxLoan}

onChange={
e=>
setLoanAmount(
Math.min(
Number(e.target.value) || 0  ,
maxLoan
)
)
}

/>



<div className="
text-sm
text-gray-500
mt-1
">

מקסימום:
₪{maxLoan.toLocaleString()}

</div>


</div>





<ResultCard

title="הלוואת בלון מלא"

data={calc.balloon}

/>



<ResultCard

title="הלוואת גרייס"

data={calc.grace}

/>



</div>


)

}





function ResultCard({title,data}:any){


return (

<div className="
rounded-xl
bg-gray-100
p-4
space-y-2
">


<h3 className="
font-bold
text-lg
text-blue-900
">

{title}

</h3>



<Row
label="החזר חודשי התחלתי"
value={data.monthly}
/>


<Row
label="החזר כולל בתום תקופה"
value={data.total}
/>


<Row
label="סה״כ ריבית"
value={data.interest}
/>


<Row
label="סה״כ מדד"
value={data.index}
/>



<div className="
border-t
pt-2
font-bold
">

עלות כוללת ריבית + מדד:

₪
{data.cost.toLocaleString()}

</div>



</div>


)

}





function Row({
label,
value
}:any){

return (

<div className="
flex
justify-between
text-sm
">

<span>
{label}
</span>


<b>
₪{Math.round(value).toLocaleString()}
</b>


</div>

)

}