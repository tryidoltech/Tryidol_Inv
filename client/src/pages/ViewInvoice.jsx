import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import amiriFont from "/public/Amiri-Regular.ttf";
import headerImage from "../assets/images/header-quotn.jpg";
import footerImage from "../assets/images/footer-quotn.jpg";

const ViewInvoice = () => {
  const [invoiceData, setInvoiceData] = useState({ items: [] });
  const [billData, setBillData] = useState({});
  const [profile, setProfile] = useState({});
  const [totalJobs, setTotalJobs] = useState(0);
  const params = useParams();

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/get/invoice?id=${params.id}`
        );

        console.log(response.data);
        setInvoiceData(response.data.data);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      }
    };

    const fetchProfileData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/get/profile`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.data.success) {
          throw new Error("Failed to fetch profile data");
        }

        setProfile(response.data.data);
      } catch (error) {
        console.error("Error fetching profile data:", error.message);
      }
    };

    fetchProfileData();
    fetchInvoiceData();
  }, [params.id]);

  useEffect(() => {
    if (profile && invoiceData) {
      const { invId, customerName, email, contact, items, discount } =
        invoiceData;
      const totalAmount = items.reduce(
        (total, item) => total + item.quantity * item.amount,
        0
      );
      let totalJobs = 0;
      items.map((item) => (totalJobs += item.quantity));
      setTotalJobs(totalJobs);
      const vatAmount = (totalAmount * profile?.tax) / 100;
      const discountAmount = (totalAmount * discount) / 100;
      const totalBillAmount = totalAmount + vatAmount - discountAmount;
      setBillData({
        invId,
        customerName,
        email,
        contact,
        totalAmount,
        vatAmount,
        totalBillAmount,
        items,
        discount,
        discountAmount,
      });
    }
  }, [invoiceData, profile]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF();

      doc.addFont(amiriFont, "Amiri", "normal");
      doc.setFont("Amiri");

      // Add header image with reduced height
      doc.addImage(headerImage, "jpg", 0, 0, 210, 20); // Reduced height

      // Add invoice details
      doc.setFontSize(10);
      doc.text(`Invoice No: ${billData.invId}`, 150, 67);
      doc.text(
        `Date: ${new Date(invoiceData.doc).toLocaleDateString()}`,
        150,
        72
      );

      // Add customer details
      doc.setFontSize(14);
      doc.text("To,", 15, 56);
      doc.setFontSize(10);
      doc.text(billData.customerName, 15, 62);
      doc.text(billData.contact, 15, 67);
      doc.text(billData.email, 15, 72);

      // Add "Quotation" centered with underline
      const pageWidth = doc.internal.pageSize.getWidth();
      const text = "Quotation";
      const textWidth = doc.getTextWidth(text);
      const textXPosition = (pageWidth - textWidth) / 2;

      doc.setFontSize(22);
      doc.text(text, textXPosition - 10, 90);

      // Draw underline for the "Quotation" text
      const lineStartX = textXPosition - 10;
      const lineEndX = textXPosition + textWidth + 8;
      const lineY = 92; // Slightly below the text
      doc.line(lineStartX, lineY, lineEndX, lineY);

      // Add "Dear Sir/Madam" section
      doc.setFontSize(13);
      doc.text("Dear Sir/Madam,", 15, 100);
      doc.setFontSize(10);
      doc.text(
        "Thank you for choosing Tryidol Technologies. We are committed to supporting your business throughout its journey and aim to",
        15,
        106
      );
      doc.text(
        "make things simple and hassle-free for you. Based on your stated requirements, we are providing the cost analysis of our",
        15,
        112
      );
      doc.text("services below.", 15, 118);

      // Pre-process the description data
      const formattedItems = billData.items.map((item, index) => {
        const descriptionLines = item.description
          .split(",")
          .map((desc) => `• ${desc.trim()}`);

        const formattedDescription = [
          item.productName,
          ...descriptionLines,
        ].join("\n");

        return [
          index + 1,
          formattedDescription,
          `${item.amount.toFixed(2)} INR`,
          item.quantity === 1
            ? `${item.quantity} Job`
            : `${item.quantity} Jobs`,
          `${(item.amount * item.quantity).toFixed(2)} INR`,
        ];
      });

      // Add items table
      doc.autoTable({
        startY: 130,
        head: [["S.N.", "Description", "Unit Price", "Qty", "Amount"]],
        body: formattedItems,
        styles: {
          fontSize: 9,
          font: "Amiri",
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          cellPadding: 2,
          halign: "left",
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: "left",
          valign: "middle",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 15 },
          1: { halign: "left", cellWidth: "wrap" },
          2: { halign: "left", cellWidth: 25 }, // Width for "Unit Price"
          3: { halign: "left", cellWidth: 15 }, // Width for "Qty"
          4: { halign: "left", cellWidth: 25 },
        },
      });

      // Calculate position for the second table
      const yPositionAfterFirstTable = doc.lastAutoTable.finalY + 5;

      // Add Grant Amount table
      doc.autoTable({
        startY: yPositionAfterFirstTable,
        head: [
          [
            "Grant amount",
            `${totalJobs === 1 ? `${totalJobs} Job` : `${totalJobs} Jobs`}`,
            `${billData?.totalBillAmount?.toFixed(2)} INR`,
          ],
        ],
        styles: {
          fontSize: 9,
          font: "Amiri",
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255],
          // cellPadding: 2,
          halign: "left",
          valign: "middle",
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: "bold",
          halign: "left",
          // valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: "left",
          valign: "middle",
        },

        margin: { left: 131 }, // Adjust the margin to shift the table to the right
      });
      // Calculate position for footer image
      const pageHeight = doc.internal.pageSize.height;
      const footerHeight = 15; // Height of footer image
      const yPositionFooter = pageHeight - footerHeight;

      // Add footer image with reduced height
      doc.addImage(footerImage, "PNG", 0, yPositionFooter, 210, footerHeight);

      // Save the PDF
      doc.save(`Invoice_${billData.customerName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <section className="p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <img src={headerImage} alt="Header" className="w-full" />
        <div className="p-6">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="font-semibold">To,</h3>
              <p>{billData?.customerName}</p>
              <p>{billData?.contact}</p>
              <p>{billData?.email}</p>
            </div>
            <div className="text-right">
              {/* <p>
                <strong>TRN NO:</strong> 104323633900003
              </p> */}
              <p>
                <strong>Invoice No:</strong> {billData?.invId}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(invoiceData.doc).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <div className="text-center text-3xl font-semibold underline">
              {" "}
              Quotation
            </div>
            <p className="text-sm">
              <span className="text-xl font-medium">Dear Sir/Madam,</span>
              <br />
              Thank you for choosing Tryidol Technologies. We are committed to
              supporting your business throughout it’s journey and aim to make
              the things simple and hassle-free for you. Based on your stated
              requirements, we are providing the cost analysis of our services
              below.
            </p>
            <br />
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th
                  className="px-4 py-2 text-center font-medium"
                  style={{ width: "7%" }}
                >
                  S.N.
                </th>
                <th
                  className="px-4 py-2 text-center font-medium"
                  style={{ width: "50%" }}
                >
                  Description
                </th>
                <th
                  className="px-4 py-2 text-center font-medium"
                  style={{ width: "15%" }}
                >
                  Unit Price
                </th>
                <th
                  className="px-4 py-2 text-center font-medium"
                  style={{ width: "12%" }}
                >
                  Qty
                </th>
                <th
                  className="px-4 py-2 text-center font-medium"
                  style={{ width: "20%" }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {billData?.items?.map((item, index) => {
                // Format the description to handle line breaks
                const formattedDescription = item.description
                  .split(",")
                  .map((desc, i) => <div key={i}>• {desc.trim()}</div>);

                return (
                  <tr key={index}>
                    <td
                      className="border px-4 py-2 text-center"
                      style={{ width: "7%" }}
                    >
                      {index + 1}
                    </td>
                    <td className="border px-4 py-2" style={{ width: "50%" }}>
                      <div>{item?.productName}</div>
                      <div>{formattedDescription}</div>
                    </td>
                    <td
                      className="border px-4 py-2 text-center"
                      style={{ width: "15%" }}
                    >
                      {item?.amount?.toFixed(2)} INR
                    </td>
                    <td
                      className="border px-4 py-2 text-center"
                      style={{ width: "12%" }}
                    >
                      {item?.quantity === 1
                        ? item?.quantity + " Job"
                        : item?.quantity + " Jobs"}
                    </td>
                    <td
                      className="border px-4 py-2 text-center"
                      style={{ width: "20%" }}
                    >
                      {(item?.amount * item?.quantity).toFixed(2)} INR
                    </td>
                  </tr>
                );
              })}
              {/* Add the calculated grant amount, quantity, and total amount row */}
              <tr style={{ visibility: "hidden" }}>
                <td>1</td>
              </tr>
              <tr>
                {/* Merge the first two columns */}
                <td
                  className="border px-4 py-2 text-center font-semibold"
                  colSpan="2"
                  style={{ border: "none" }}
                ></td>
                {/* Keep an empty cell to maintain space */}
                <td className="border py-2 text-base bg-gray-100 text-center font-semibold">
                  Grant amount
                </td>
                <td className="border py-2 text-base bg-gray-100 text-center font-semibold">
                  {totalJobs === 1 ? `${totalJobs} Job` : `${totalJobs} Jobs`}
                </td>
                <td className="border py-2 text-base bg-gray-100 text-center font-bold">
                  {billData?.totalBillAmount?.toFixed(2)} INR
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <img src={footerImage} alt="Footer" className="w-full" />
      </div>
      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded-lg"
          onClick={generatePDF}
        >
          Download PDF
        </button>
      </div>
    </section>
  );
};

export default ViewInvoice;
