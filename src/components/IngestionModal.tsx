"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  X,
  Upload,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  Trash2,
  Sparkles,
  Check,
  Ban,
  Copy,
  Clock,
  Layers,
  MessageSquare,
  Star,
  Globe,
  Smartphone,
  Mail,
  HelpCircle,
  Share2,
  MessageCircle,
} from "lucide-react";
import {
  parseAndValidateFile,
  parseCsvWithPapa,
  smartSplitPastedFeedback,
  validateAndProcessRows,
  ValidationSummary,
  ParsedFeedbackRow,
  SupportedFileType,
} from "@/lib/importer";
import { SUPPORTED_CHANNELS, SupportedChannelType } from "@/lib/validations/import";

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngestionModal({ isOpen, onClose, onSuccess }: IngestionModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "single" | "paste" | "simulate">("file");

  // Single Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [company, setCompany] = useState("");
  const [channel, setChannel] = useState<SupportedChannelType>("SUPPORT_TICKET");
  const [source, setSource] = useState("");
  const [rating, setRating] = useState<number | "">(5);
  const [product, setProduct] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [singleError, setSingleError] = useState("");

  // File Upload State
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [importResult, setImportResult] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  // Paste State
  const [pastedText, setPastedText] = useState("");
  const [pasteSummary, setPasteSummary] = useState<ValidationSummary | null>(null);

  // Simulation State
  const [simulatingChannel, setSimulatingChannel] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Single Entry Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          company,
          channel,
          source,
          rating: rating ? Number(rating) : undefined,
          product,
          title,
          content,
          tags,
          priority,
          customerLabel: customerName || customerEmail || company || "Direct Entry",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSingleError(data.error || "Failed to submit feedback entry.");
      } else {
        // Reset single form
        setContent("");
        setTitle("");
        setCustomerName("");
        setCustomerEmail("");
        setCompany("");
        setTags("");
        onSuccess();
        onClose();
      }
    } catch {
      setSingleError("Network error submitting feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process File Selection
  const processFile = async (file: File) => {
    setFileError("");
    setSelectedFile(file);
    setImportResult(null);
    setIsParsing(true);
    setImportProgress(15);
    setProgressStatus("Detecting format and extracting file content...");

    try {
      const summary = await parseAndValidateFile(file);
      setImportProgress(100);
      setValidationSummary(summary);
      if (summary.totalRows === 0) {
        setFileError("The uploaded file contains no readable feedback rows or content.");
      }
    } catch (err: any) {
      console.error("Client file parsing error:", err);
      setFileError(err.message || "Failed to parse file. Verify file format (CSV, Excel, JSON, TXT, DOCX, PDF).");
    } finally {
      setIsParsing(false);
      setTimeout(() => setImportProgress(null), 400);
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["csv", "xlsx", "xls", "json", "txt", "docx", "pdf"].includes(ext || "")) {
        processFile(file);
      } else {
        setFileError("Unsupported file type. Supported: .csv, .xlsx, .xls, .json, .txt, .docx, .pdf");
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setValidationSummary(null);
    setImportResult(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Paste Change
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    setImportResult(null);
    setFileError("");

    if (!text.trim()) {
      setPasteSummary(null);
      return;
    }

    try {
      const rawRows = smartSplitPastedFeedback(text.trim());
      const summary = validateAndProcessRows(rawRows, "txt");
      setPasteSummary(summary);
    } catch {
      setPasteSummary(null);
    }
  };

  // Submit Bulk File / Data Import to API
  const handleBulkImportSubmit = async (activeSummary: ValidationSummary | null, isPasteMode = false) => {
    if (!activeSummary || activeSummary.validRowsCount === 0) return;

    setIsSubmitting(true);
    setImportProgress(20);
    setProgressStatus("Submitting validated dataset to server pipeline...");

    try {
      let res: Response;

      if (!isPasteMode && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        setImportProgress(50);
        setProgressStatus("Executing AI classification pipeline & DB insert...");

        res = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });
      } else {
        setImportProgress(50);
        setProgressStatus("AI classification & database batch processing...");

        res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            validatedRows: activeSummary.rows,
          }),
        });
      }

      setImportProgress(90);
      setProgressStatus("Finalizing summary metrics & audit logs...");
      const data = await res.json();
      setImportProgress(100);

      if (!res.ok) {
        setFileError(data.error || "Failed to complete import request.");
      } else {
        setImportResult(data);
        if (data.success) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setFileError(err.message || "Network error occurred during import.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setImportProgress(null), 600);
    }
  };

  // Handle Channel Simulation Sync
  const handleSimulate = async (sourceKey: string) => {
    setSimulatingChannel(sourceKey);
    setSimResult(null);

    try {
      const res = await fetch("/api/feedback/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceKey }),
      });

      const data = await res.json();
      setSimResult(data);
      if (data.success) {
        onSuccess();
      }
    } catch {
      alert("Failed to simulate channel stream.");
    } finally {
      setSimulatingChannel(null);
    }
  };

  const getBadgeForFileType = (type: SupportedFileType) => {
    const badgeMap: Record<SupportedFileType, { label: string; color: string }> = {
      csv: { label: "CSV", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      xlsx: { label: "Excel (.xlsx)", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
      xls: { label: "Excel (.xls)", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
      json: { label: "JSON", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      txt: { label: "Text (.txt)", color: "bg-slate-800 text-slate-300 border-slate-700" },
      docx: { label: "Word (.docx)", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      pdf: { label: "PDF (.pdf)", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
      unknown: { label: "Unknown", color: "bg-slate-800 text-slate-400 border-slate-700" },
    };
    const item = badgeMap[type] || badgeMap.unknown;
    return (
      <span className={`px-2.5 py-0.5 text-xs font-mono font-semibold border rounded-md ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Enterprise Feedback Ingestion Engine</h2>
              <p className="text-xs text-slate-400">Ingest, validate & AI-classify customer feedback across all channels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-950/70 border-b border-slate-800 flex space-x-2">
          <button
            onClick={() => setActiveTab("file")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "file"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk File Import</span>
          </button>

          <button
            onClick={() => setActiveTab("single")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "single"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>

          <button
            onClick={() => setActiveTab("paste")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "paste"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Paste Reviews</span>
          </button>

          <button
            onClick={() => setActiveTab("simulate")}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === "simulate"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Simulate Channels</span>
          </button>
        </div>

        {/* Progress Bar Overlay */}
        {importProgress !== null && (
          <div className="bg-indigo-950/60 border-b border-indigo-500/20 px-6 py-2">
            <div className="flex justify-between items-center text-xs font-medium text-indigo-300 mb-1">
              <span>{progressStatus || "Processing AI pipeline..."}</span>
              <span className="font-mono">{importProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BULK FILE IMPORT */}
          {activeTab === "file" && (
            <div className="space-y-5">
              {fileError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Drag-and-Drop Dropzone */}
              {!selectedFile && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
                      : "border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/80"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Drag & Drop File to Import
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Supports <code className="text-indigo-300 font-mono">CSV, XLSX, XLS, JSON, TXT, DOCX, PDF</code>
                  </p>

                  <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Select File</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, .json, .txt, .docx, .pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-center space-x-6 text-[11px] text-slate-400">
                    <div><strong className="text-slate-300">Required:</strong> content, channel, customerLabel</div>
                    <div><strong className="text-slate-300">Optional:</strong> customerName, customerEmail, company, rating, title, product</div>
                  </div>
                </div>
              )}

              {/* Selected File Bar */}
              {selectedFile && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">{selectedFile.name}</span>
                        {validationSummary && getBadgeForFileType(validationSummary.fileType)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={clearFile}
                    className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center space-x-1.5 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Change File</span>
                  </button>
                </div>
              )}

              {/* Validation Summary Card & Preview */}
              {validationSummary && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
                  {/* Summary Counters */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                      <div className="text-xs text-slate-400 font-medium">Total Rows</div>
                      <div className="text-lg font-bold text-white mt-1">{validationSummary.totalRows}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-emerald-400 font-medium flex items-center justify-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Valid Rows</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-300 mt-1">{validationSummary.validRowsCount}</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-rose-400 font-medium flex items-center justify-center space-x-1">
                        <Ban className="w-3.5 h-3.5" />
                        <span>Invalid</span>
                      </div>
                      <div className="text-lg font-bold text-rose-300 mt-1">{validationSummary.invalidRowsCount}</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-amber-400 font-medium flex items-center justify-center space-x-1">
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicates</span>
                      </div>
                      <div className="text-lg font-bold text-amber-300 mt-1">{validationSummary.duplicateRowsCount}</div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Dataset Preview (First {Math.min(10, validationSummary.rows.length)} of {validationSummary.totalRows} rows)
                      </h4>
                    </div>

                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-center w-10">#</th>
                            <th className="px-3 py-2">Content</th>
                            <th className="px-3 py-2 w-32">Channel</th>
                            <th className="px-3 py-2 w-32">Customer</th>
                            <th className="px-3 py-2 text-center w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {validationSummary.previewRows.map((row: ParsedFeedbackRow) => (
                            <tr
                              key={row.rowNumber}
                              className={`hover:bg-slate-900/60 transition-colors ${
                                !row.isValid ? "bg-rose-950/10 text-rose-200" : row.isDuplicate ? "bg-amber-950/10 text-amber-200" : "text-slate-300"
                              }`}
                            >
                              <td className="px-3 py-2 text-center font-sans text-slate-500 text-[10px]">
                                {row.rowNumber}
                              </td>
                              <td className="px-3 py-2 font-sans truncate max-w-[280px]" title={row.content}>
                                {row.content || <span className="text-slate-600 italic">Empty</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
                                  {row.channel}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-sans truncate max-w-[130px]">
                                {row.customerLabel}
                              </td>
                              <td className="px-3 py-2 text-center font-sans">
                                {row.isValid ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-semibold">
                                    <Check className="w-3 h-3" />
                                    <span>Valid</span>
                                  </span>
                                ) : row.isDuplicate ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-semibold">
                                    <Copy className="w-3 h-3" />
                                    <span>Duplicate</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-semibold">
                                    <Ban className="w-3 h-3" />
                                    <span>Invalid</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Validation Error Log */}
                  {validationSummary.validationErrors.length > 0 && (
                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3.5 space-y-2">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Validation Error Log ({validationSummary.validationErrors.length} rows flagged)</span>
                      </h4>
                      <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono text-rose-300/90 pr-1">
                        {validationSummary.validationErrors.map((errItem) => (
                          <div key={errItem.rowNumber} className="flex space-x-2">
                            <span className="text-rose-400 font-bold">Row #{errItem.rowNumber}:</span>
                            <span>{errItem.errors.join("; ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Result Screen */}
              {importResult && (
                <div className="p-4 rounded-xl text-xs border space-y-3 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Feedback Import Completed</span>
                    </div>
                    {importResult.summary?.processingTimeMs && (
                      <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{importResult.summary.processingTimeMs} ms</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-2 font-mono text-[11px] text-emerald-200">
                    <div>Processed: {importResult.summary?.totalProcessed}</div>
                    <div>Imported: {importResult.summary?.importedCount}</div>
                    <div>Skipped: {importResult.summary?.skippedCount}</div>
                    <div>Duplicates: {importResult.summary?.duplicateCount}</div>
                  </div>

                  {importResult.summary?.validationErrors && importResult.summary.validationErrors.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1 text-[11px] font-mono text-slate-300">
                      <div className="font-semibold text-amber-300">Skipped/Validation Warnings:</div>
                      {importResult.summary.validationErrors.slice(0, 5).map((e: string, idx: number) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Controls */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleBulkImportSubmit(validationSummary, false)}
                  disabled={
                    isSubmitting ||
                    isParsing ||
                    !validationSummary ||
                    validationSummary.validRowsCount === 0
                  }
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Running AI Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>
                        Import {validationSummary?.validRowsCount || 0} Valid Feedback Records
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL SINGLE ENTRY */}
          {activeTab === "single" && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {singleError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{singleError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Company
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Channel Source *
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as SupportedChannelType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {SUPPORTED_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Source System
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zendesk, AppStore"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Rating (1-5)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={5}>5 Stars ⭐⭐⭐⭐⭐</option>
                    <option value={4}>4 Stars ⭐⭐⭐⭐</option>
                    <option value={3}>3 Stars ⭐⭐⭐</option>
                    <option value={2}>2 Stars ⭐⭐</option>
                    <option value={1}>1 Star ⭐</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Product / Module
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mobile App, Analytics"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Title / Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dashboard slow loading times"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Feedback Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Paste verbatim customer feedback text..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. onboarding, bug, mobile, churn_risk"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Classifying with AI...</span>
                    </>
                  ) : (
                    <span>Submit & Run AI Pipeline</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PASTE REVIEWS */}
          {activeTab === "paste" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Paste Raw Reviews / Multi-Line Text
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Paste multiple customer reviews. Our parser will automatically split items by double newlines or speaker headers (e.g. <code className="text-indigo-300">John: Great product!</code>).
                </p>
                <textarea
                  rows={7}
                  placeholder={`John:
Amazing product, saved our team hours of work!

Sarah:
Battery drains fast when viewing analytics charts.

Mike:
Delivery of report export was delayed by 2 hours.`}
                  value={pastedText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Paste Split Preview */}
              {pasteSummary && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">
                      Auto-Split Engine Detected {pasteSummary.totalRows} Individual Reviews
                    </span>
                    <span className="text-emerald-400 font-medium font-mono">
                      {pasteSummary.validRowsCount} Valid Items Ready
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg">
                    {pasteSummary.rows.map((r) => (
                      <div key={r.rowNumber} className="p-2 text-[11px] flex justify-between items-start space-x-2">
                        <div className="flex-1">
                          <span className="font-semibold text-slate-200">{r.customerLabel}: </span>
                          <span className="text-slate-400 font-sans">"{r.content}"</span>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono shrink-0">
                          {r.channel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Control */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleBulkImportSubmit(pasteSummary, true)}
                  disabled={isSubmitting || !pasteSummary || pasteSummary.validRowsCount === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Classifying & Importing...</span>
                    </>
                  ) : (
                    <span>Import {pasteSummary?.validRowsCount || 0} Split Reviews</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SIMULATED CHANNELS */}
          {activeTab === "simulate" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Click any channel card to simulate realistic incoming feedback streams into your AI pipeline without external keys.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "amazon", title: "Amazon Reviews", icon: Star, desc: "Product reviews & rating scores", color: "text-amber-400" },
                  { key: "google", title: "Google Reviews", icon: Globe, desc: "Local business & store reviews", color: "text-blue-400" },
                  { key: "appstore", title: "Apple App Store", icon: Smartphone, desc: "iOS app review feedback & crash bugs", color: "text-cyan-400" },
                  { key: "playstore", title: "Google Play Store", icon: Smartphone, desc: "Android user rating & performance notes", color: "text-emerald-400" },
                  { key: "zendesk", title: "Support Tickets", icon: HelpCircle, desc: "Zendesk & HelpScout ticket threads", color: "text-indigo-400" },
                  { key: "email", title: "Inbound Emails", icon: Mail, desc: "Direct customer support emails", color: "text-violet-400" },
                  { key: "nps", title: "NPS Survey", icon: CheckCircle2, desc: "Quarterly promoter/detractor scores", color: "text-pink-400" },
                  { key: "social", title: "Social Media", icon: Share2, desc: "Twitter/X & LinkedIn mentions", color: "text-sky-400" },
                  { key: "chat", title: "Live Chat", icon: MessageCircle, desc: "Intercom & Drift live chat logs", color: "text-teal-400" },
                  { key: "contact", title: "Website Form", icon: FileText, desc: "Inbound enterprise contact requests", color: "text-rose-400" },
                ].map((card) => {
                  const IconComp = card.icon;
                  return (
                    <div
                      key={card.key}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
                    >
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center space-x-2">
                          <IconComp className={`w-4 h-4 ${card.color}`} />
                          <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {card.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400">{card.desc}</p>
                      </div>

                      <button
                        onClick={() => handleSimulate(card.key)}
                        disabled={simulatingChannel === card.key}
                        className="bg-slate-900 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-800 text-slate-300 text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {simulatingChannel === card.key ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Simulate Sync</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {simResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    Successfully simulated import of {simResult.imported || 2} customer records from '{simResult.source}'.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
