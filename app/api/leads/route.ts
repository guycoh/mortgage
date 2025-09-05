import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL LEADS
export async function GET(req: NextRequest) {    
    return getLeads();
}
async function getLeads() {
    const { data, error } = await supabase.from('leads').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}

//CREATE NEW LEAD

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log('Received body:', body);  // להדפיס את מה שהשרת מקבל
    return createLead(body);
}

async function createLead(body: any) {
    const { data, error } = await supabase.from('leads').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}
















// import { createClient } from "@supabase/supabase-js";
// import { NextResponse } from "next/server";
// import { NextApiRequest, NextApiResponse } from "next";


// export async function GET(request:Request) {
   
 
//     const supabase=createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
//  const {data} =await supabase.from('leads').select()  
// return  NextResponse.json(data);
// }








// POST: Create a new user
// const createLead = async (req: NextApiRequest, res: NextApiResponse) => {
//   const supabase=createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
 
 
//   const { name, email,cell,zoom_comment, zoom,date_zoom,hour_zoom } = req.body;

//   if (!name || !email || !cell) {
//     return res.status(400).json({ error: 'Name and email are required' });
//   }

//   const { data, error } = await supabase.from('leads').insert([{ name, email ,zoom_comment, zoom, date_zoom, hour_zoom  }]);
//   if (error) return res.status(500).json({ error: error.message });
//   res.status(201).json(data);
// };





// export async function Post(request:Request) {
//    const {leads}=await request.json();
 
//     const supabase=createClient(
//      process.env.NEXT_PUBLIC_SUPABASE_URL!,
//      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//  );
//   const {data} =await supabase.from('leads').insert({leads});  
//  return  NextResponse.json(data);
//  }



// export function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === "POST") {
//     const { name, email, cell,zoom_comment,date_zoom,hour_zoom } = req.body;

//     // Add server-side validation or handle the data here
//     if (!name || !email || !cell || !date_zoom || !hour_zoom ) {
//       return res.status(400).json({ message: "All fields are required." });
//     }

//     // Simulate saving to a database or sending an email
//     console.log("Form data received:", { name, email, cell,zoom_comment,date_zoom,hour_zoom });

//     return res.status(200).json({ message: "Your message has been received!" });
//   }

//   res.setHeader("Allow", ["POST"]);
//   res.status(405).json({ message: `Method ${req.method} not allowed.` });
// }
