import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);


export async function POST(req: Request) {

  try {

    const formData = await req.formData();


    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const file = formData.get("file") as File;


    if (!file) {
      return Response.json(
        { error:"No file" },
        { status:400 }
      );
    }


    const buffer = Buffer.from(
      await file.arrayBuffer()
    );


    const result = await resend.emails.send({

      from:
        `Morgi <${process.env.RESEND_FROM_EMAIL}>`,


      to:[
        process.env.RESEND_TO_EMAIL!
      ],


      subject:
        `דוח יתרות לסילוק - ${name}`,


      html:`

      <h2>דוח חדש התקבל</h2>

      <p>
      שם: ${name}
      </p>

      <p>
      טלפון: ${phone}
      </p>

      `,


      attachments:[
        {
          filename:file.name,
          content:buffer
        }
      ]

    });


    console.log("RESEND:", result);


    return Response.json({
      success:true
    });


  } catch(error){

    console.error(error);

    return Response.json(
      {
        error:"send failed"
      },
      {
        status:500
      }
    );

  }

}