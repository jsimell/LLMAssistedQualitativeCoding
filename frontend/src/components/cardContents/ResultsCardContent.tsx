import { useEffect, useContext, useState } from "react";
import { WorkflowContext } from "../../context/WorkflowContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Label, Cell } from "recharts";
import Button from "../Button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import { getPassageWithSurroundingContext } from "./codingStep/utils/passageUtils";

const ResultsCardContent = () => {
  const context = useContext(WorkflowContext)!;
  const { codes, passages, passagesPerColumn, codebook, uploadedFile, examplesPrecedingContextSize, examplesTrailingContextSize } = context;
  const [data, setData] = useState<{ code: string; count: number }[]>([]);

  useEffect(() => {
    // Count code occurrences
    const codeCounts = Array.from(codebook)
      .map((code) => ({
        code: code,
        count: codes.filter((c) => c.code === code).length,
      }))
      .sort((a, b) => b.count - a.count);

    // Update the state with the sorted data
    setData(codeCounts);
  }, []);

  /** A helper function for truncating long labels on the x-axis.
   * @param label The original label string
   * @returns The truncated label if it exceeds maxLength, otherwise the original label
   */
  const truncateLabel = (label: string) => {
    const maxLength = 48;
    return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
  };

  /**
   * Handles the download of the coded passages as a CSV file.
   */
  const handleFileDownload = () => {
    const setsOfPassages =
      passagesPerColumn ?? new Map<number, typeof passages>([[0, passages]]); // For text files, there is only one set

    // For each set of passages in the map, create and download a CSV
    setsOfPassages.forEach((columnPassages, columnIndex) => {
      // Prepare CSV content for this column
      let csvContent = "data:text/csv;charset=utf-8,Context,Passage,Codes\n";

      // If there are no coded passages, skip this column (i.e. no download triggered)
      if (!columnPassages.some((p) => p.codeIds.length > 0)) return;

      columnPassages.forEach((p) => {
        if (p.codeIds.length === 0) return; // Skip passages with no codes

        const passageCodes = p.codeIds
          .map((id: string | number) => codes.find((c) => c.id === id)?.code)
          .filter(Boolean) as string[];

        const uniqueCodes = Array.from(new Set(passageCodes));
        const codesString = uniqueCodes.join("; ");

        // Use this column's passages to compute context
        const { precedingContext, passageText, trailingContext } =
          getPassageWithSurroundingContext(
            p,
            passages,
            examplesPrecedingContextSize ?? 30,
            examplesTrailingContextSize ?? 15,
            uploadedFile?.type === "text/csv"
          );

        let contextText = `${precedingContext}${passageText}${trailingContext}`;

        // Remove the record separator characters that were used as row ending tokens
        contextText = contextText.replace("\u001E", "");

        // Escape double quotes by doubling them, and wrap fields in double quotes
        csvContent += `"${contextText.replace(/"/g, '""')}","${passageText.replace(
          /"/g,
          '""'
        )}","${codesString}"\n`;
      });

      // Create a download link and trigger the download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const suffix = setsOfPassages.size > 1 ? `_column_${columnIndex}` : "";
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `coded_passages${suffix}.csv`);
      document.body.appendChild(link); // Required for Firefox
      link.click();
      document.body.removeChild(link);
    });
  };

  /**
   * Handles the download of the codebook as a CSV file.
   */
  const handleCodebookDownload = () => {
    const getCodeCount = (entry: string) => {
      return codes.filter((c) => (c.code ?? "").trim() === entry.trim()).length ?? 0;
    };
    const csvContent = Array.from(codebook)
      .filter((code) => (code ? code.trim().length > 0 : false))
      .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
      .sort((a, b) => getCodeCount(b) - getCodeCount(a)) // Then sort by count
      .map((code) => {
        const count = getCodeCount(code);
        return `${code},${count}\n`;
      })
      .join("");

    const blob = new Blob(["Code,Count\n" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "codebook.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-15 items-center mt-6">
      {/* Chart container with vertical scroll if needed */}
      <div className="flex items-start justify-center overflow-y-auto overflow-x-hidden max-h-[50vh] border border-outline rounded-sm px-4 py-2 min-h-[40vh] min-w-[40vw]">
        {codebook.size === 0 ? (
          <p>No codes have been added yet.</p>
        ) : (
          <BarChart
            layout="vertical"
            width={850}
            height={data.length * 50} // 50px per bar
            data={data}
            margin={{ top: 20, right: 30, left: 8, bottom: 20 }}
            barCategoryGap={10} // gap between bars; constant
          >
            {/* Y-axis for labels */}
            <YAxis
              type="category"
              dataKey="code"
              width={200} // max 25% width
              tickFormatter={truncateLabel}
            />

            {/* X-axis for counts */}
            <XAxis type="number" hide={true} />

            <Tooltip/>

            {/* Bars */}
            <Bar dataKey="count" fill="#4F6074" barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} />
              ))}
              <LabelList dataKey="count" position="right" style={{ fill: "#000" }} />
            </Bar>
          </BarChart>
        )}
      </div>

      <div className="flex flex-col gap-16 items-center">
        <div className="flex flex-col gap-4 items-center max-w-[400px]">
          <p className="text-center">
            Download coded passages, their context, and their codes as a CSV file. Uses the same preceding and trailing context sizes as the few-shot examples.
          </p>
          <Button
            onClick={handleFileDownload}
            label={"Download passages"}
            icon={ArrowDownTrayIcon}
            variant="tertiary"
            title={"Download coded passages as a CSV file"}
          />
          <p className="text-sm text-center pt-1.5">
            <b>NOTE:</b> If you uploaded a multi column CSV file, the download will include separate
            files for each column that you added some codes to.
          </p>
        </div>
        <div className="flex flex-col gap-4 items-center max-w-[400px]">
          <p>Download the codebook and code counts as a CSV file:</p>
          <Button
            onClick={handleCodebookDownload}
            label={"Download codebook"}
            icon={ArrowDownTrayIcon}
            variant="tertiary"
            title={"Download the codebook as a CSV file"}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsCardContent;
