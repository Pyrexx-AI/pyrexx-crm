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
import { MoreHorizontal, Search } from "lucide-react";
import { useRouter } from "next/navigation";

// <-- Updated to allow nulls, preventing strict TS failures
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null; 
  phone: string | null;
  stage: string;
  type: string;
}

interface ContactsTableProps {
  data: Contact[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function ContactsTable({ data, searchQuery, setSearchQuery }: ContactsTableProps) {
  const router = useRouter();

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${row.original.first_name} ${row.original.last_name}`} size={28} />
          <span className="text-ink font-medium">
            {row.original.first_name} {row.original.last_name}
          </span>
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => {
        const stage = row.original.stage;
        const variantMap: Record<string, "slate" | "amber" | "berry" | "sage"> = {
          "New Lead": "slate",
          "Demo Scheduled": "amber",
          "Contract Sent": "berry",
          "Active Client": "sage"
        };
        return <Badge variant={variantMap[stage] || "slate"}>{stage}</Badge>;
      }
    },
    {
      id: "actions",
      cell: () => (
        <div className="text-right">
          <MoreHorizontal size={15} className="text-slate inline-block" />
        </div>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts (Global SQL Search)..."
            className="pl-8 pr-3 py-2 rounded-lg text-sm w-full outline-none bg-white border border-line text-ink focus:border-berry transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="hidden md:block rounded-xl overflow-hidden border border-line bg-white shadow-card">
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
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id} 
                onClick={() => router.push(`/contacts/${row.original.id}`)}
                className="cursor-pointer transition-colors border-b border-line hover:bg-paperDim/50 last:border-b-0"
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-5 py-3 text-slate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate">
                  No contacts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {data.map(contact => (
          <div 
            key={contact.id} 
            onClick={() => router.push(`/contacts/${contact.id}`)}
            className="w-full text-left rounded-xl p-4 flex items-center gap-3 bg-white border border-line shadow-card active:scale-[0.98] transition-transform"
          >
            <Avatar name={`${contact.first_name} ${contact.last_name}`} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink font-body">
                {contact.first_name} {contact.last_name}
              </div>
              <div className="text-xs truncate text-slate font-body mt-0.5">
                {contact.email || contact.phone}
              </div>
            </div>
            <Badge variant="slate">{contact.stage}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}