"use client";
import React from "react";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  ColumnDef 
} from "@tanstack/react-table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MoreHorizontal, Search, Building2, Globe, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ContactsTableProps {
  data: any[];
  viewMode: "people" | "companies";
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading?: boolean;
}

export function ContactsTable({ data, viewMode, searchQuery, setSearchQuery, isLoading }: ContactsTableProps) {
  const router = useRouter();

  // Columns for PEOPLE
  const peopleColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Person Name",
      cell: ({ row }) => {
        const firstName = row.original.first_name || "";
        const lastName = row.original.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={fullName} size={28} />
            <span className="text-ink font-medium">{fullName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "company",
      header: "Clinic / Company",
      cell: ({ row }) => {
        const company = row.original.companies;
        if (!company || !company.name) return <span className="text-slate/50">—</span>;
        return (
          <Link 
            href={`/companies/${company.id}`}
            onClick={(e) => e.stopPropagation()} 
            className="inline-flex items-center gap-1.5 text-berry hover:underline font-medium transition-colors"
          >
            <Building2 size={12} />
            <span className="truncate max-w-[150px] sm:max-w-none">{company.name}</span>
          </Link>
        );
      }
    },
    { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="truncate max-w-[150px] inline-block">{row.original.email || "—"}</span> },
    { accessorKey: "phone", header: "Mobile Phone", cell: ({ row }) => <span className="font-mono text-slate">{row.original.phone || "—"}</span> },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => <Badge variant="slate">{row.original.stage || "New Lead"}</Badge>
    },
    {
      id: "actions",
      cell: () => <MoreHorizontal size={15} className="text-slate ml-auto" />
    }
  ];

  // Columns for COMPANIES
  const companyColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Company / Clinic Name",
      cell: ({ row }) => {
        // FIX: Deep null safety for name extraction
        const name = row.original.name || "Unnamed Company";
        const initial = name.charAt(0).toUpperCase() || "C";
        
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-paperDim border border-line flex items-center justify-center text-ink font-body font-bold text-xs uppercase shadow-sm">
              {initial}
            </div>
            <span className="text-ink font-medium font-body truncate max-w-[200px]">{name}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "website",
      header: "Website",
      cell: ({ row }) => row.original.website ? (
        <a href={row.original.website.startsWith('http') ? row.original.website : `https://${row.original.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-slate hover:text-berry flex items-center gap-1.5 transition-colors">
          <Globe size={12} /> <span className="truncate max-w-[150px]">{row.original.website.replace(/^https?:\/\//, '')}</span>
        </a>
      ) : <span className="text-slate/50">—</span>
    },
    {
      accessorKey: "phone",
      header: "Office Line",
      cell: ({ row }) => row.original.phone ? (
        <span className="font-mono text-slate flex items-center gap-1.5"><Phone size={12} /> {row.original.phone}</span>
      ) : <span className="text-slate/50">—</span>
    },
    {
      accessorKey: "people_count",
      header: "Linked People",
      cell: ({ row }) => <Badge variant="sage">{row.original.contacts?.length || 0} Contacts</Badge>
    },
    {
      id: "actions",
      cell: () => <MoreHorizontal size={15} className="text-slate ml-auto" />
    }
  ];

  const columns = viewMode === "people" ? peopleColumns : companyColumns;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full max-w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${viewMode === "people" ? "people" : "clinics"}...`}
            className="pl-8 pr-3 py-2 rounded-lg text-sm w-full outline-none bg-white border border-line text-ink focus:border-berry transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="hidden md:block rounded-xl overflow-hidden border border-line bg-white shadow-card min-h-[400px]">
        <table className="w-full text-sm font-body">
          <thead className="bg-paperDim border-b border-line">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="text-left px-5 py-3 text-xs uppercase text-slate tracking-[0.05em]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-line animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-28" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-36" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-24" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-16" /></td>
                  {viewMode === "people" && <td className="px-5 py-4"><div className="h-4 bg-paperDim rounded w-6 ml-auto" /></td>}
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  onClick={() => router.push(viewMode === "people" ? `/contacts/${row.original.id}` : `/companies/${row.original.id}`)}
                  className="cursor-pointer transition-colors border-b border-line hover:bg-paperDim/50 last:border-b-0"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-5 py-3 text-slate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate">
                  No {viewMode === "people" ? "people" : "companies"} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-white border border-line rounded-xl animate-pulse" />
          ))
        ) : data.map(item => {
          const title = viewMode === "people" 
            ? `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unknown" 
            : item.name || "Unnamed Company";
          
          const subtitle = viewMode === "people" 
            ? (item.companies?.name || item.email || "No company") 
            : (item.website || item.phone || "No details");

          return (
            <div 
              key={item.id} 
              onClick={() => router.push(viewMode === "people" ? `/contacts/${item.id}` : `/companies/${item.id}`)}
              className="w-full text-left rounded-xl p-4 flex items-center gap-3 bg-white border border-line shadow-card active:scale-[0.98] transition-transform"
            >
              {viewMode === "people" ? (
                <Avatar name={title} size={36} />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-paperDim border border-line flex items-center justify-center text-ink font-body font-bold text-sm uppercase">
                  {title.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink font-body truncate">{title}</div>
                <div className="text-xs truncate text-slate font-body mt-0.5">{subtitle}</div>
              </div>
              <Badge variant="slate">{viewMode === "people" ? item.stage : `${item.contacts?.length || 0} Contacts`}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}