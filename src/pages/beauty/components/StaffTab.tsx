import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Clock, Mail, Phone, Trash2, Pencil } from "lucide-react";
import type { BeautyServiceOffering } from "@workspace/api-client-react";

export interface StaffMember {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  phone: string;
  avatarUrl: string;
  accessRole: "owner" | "admin" | "staff";
  isAvailable: boolean;
  assignedServiceIds: string[];
  workingHours: string;
  meetingLink?: string;
}

const mockInitialStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Kovács Kata",
    roleTitle: "Mesterfodrász & Színspecialista",
    email: "kata@ilolit-beauty.hu",
    phone: "+36 30 111 2233",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop",
    accessRole: "owner",
    isAvailable: true,
    assignedServiceIds: ["srv-1", "srv-2"],
    workingHours: "Hé - Pén: 09:00 - 17:00",
    meetingLink: "https://meet.google.com/abc-defg-hij",
  },
  {
    id: "staff-2",
    name: "Nagy Dóra",
    roleTitle: "Junior Fodrász & Férfi Hajvágó",
    email: "dora@ilolit-beauty.hu",
    phone: "+36 70 444 5566",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop",
    accessRole: "staff",
    isAvailable: true,
    assignedServiceIds: ["srv-1"],
    workingHours: "Kedd - Szo: 10:00 - 18:00",
  },
];

interface StaffTabProps {
  services: BeautyServiceOffering[];
}

export function StaffTab({ services }: StaffTabProps) {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>(mockInitialStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [formAccessRole, setFormAccessRole] = useState<"owner" | "admin" | "staff">("staff");
  const [formWorkingHours, setFormWorkingHours] = useState("Hétfő - Péntek: 09:00 - 17:00");

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormName("");
    setFormRole("");
    setFormEmail("");
    setFormPhone("");
    setFormAvatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop");
    setFormAccessRole("staff");
    setFormWorkingHours("Hétfő - Péntek: 09:00 - 17:00");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormRole(staff.roleTitle);
    setFormEmail(staff.email);
    setFormPhone(staff.phone);
    setFormAvatar(staff.avatarUrl);
    setFormAccessRole(staff.accessRole);
    setFormWorkingHours(staff.workingHours);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast({ title: "Kérjük adja meg a munkatárs nevét!", variant: "destructive" });
      return;
    }

    if (editingStaff) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                name: formName,
                roleTitle: formRole,
                email: formEmail,
                phone: formPhone,
                avatarUrl: formAvatar,
                accessRole: formAccessRole,
                workingHours: formWorkingHours,
              }
            : s
        )
      );
      toast({ title: "Munkatárs adatai frissítve!" });
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        name: formName,
        roleTitle: formRole || "Munkatárs",
        email: formEmail,
        phone: formPhone,
        avatarUrl: formAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop",
        accessRole: formAccessRole,
        isAvailable: true,
        assignedServiceIds: services.map((s) => s.id),
        workingHours: formWorkingHours,
      };
      setStaffList((prev) => [...prev, newStaff]);
      toast({ title: "Új munkatárs sikeresen hozzáadva!" });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Munkatárs eltávolítva." });
  };

  const toggleAvailability = (id: string) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isAvailable: !s.isAvailable } : s))
    );
    toast({ title: "Munkatárs foglalhatósága frissítve." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900">8. Munkatársak & Csapatkezelés</h2>
          </div>
          <p className="text-sm text-slate-500">
            Adjon hozzá kollégákat, állítsa be a jogosultságaikat, egyedi munkaidejüket és a hozzájuk rendelt szolgáltatásokat.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md">
          <UserPlus className="w-4 h-4" /> Új munkatárs hozzáadása
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staffList.map((staff) => (
          <Card key={staff.id} className="p-6 border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={staff.avatarUrl}
                    alt={staff.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/20 shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-slate-900">{staff.name}</h3>
                      {staff.accessRole === "owner" && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                          Tulajdonos
                        </Badge>
                      )}
                      {staff.accessRole === "admin" && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]">
                          Admin
                        </Badge>
                      )}
                      {staff.accessRole === "staff" && (
                        <Badge variant="outline" className="text-slate-600 font-bold text-[10px]">
                          Munkatárs
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-emerald-700 font-medium">{staff.roleTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-900" onClick={() => handleOpenEdit(staff)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {staff.accessRole !== "owner" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(staff.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{staff.email || "Nincs e-mail megadva"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{staff.phone || "Nincs telefonszám"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{staff.workingHours}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={staff.isAvailable}
                  onCheckedChange={() => toggleAvailability(staff.id)}
                  id={`avail-${staff.id}`}
                />
                <label htmlFor={`avail-${staff.id}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                  {staff.isAvailable ? "Online foglalható" : "Ideiglenesen szünetel"}
                </label>
              </div>
              <Badge className={staff.isAvailable ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" : "bg-slate-100 text-slate-500 font-bold"}>
                {staff.isAvailable ? "Aktív" : "Inaktív"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-xl text-slate-900">
              {editingStaff ? "Munkatárs szerkesztése" : "Új munkatárs hozzáadása"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Munkatárs neve *</label>
              <Input
                placeholder="Pl. Kovács Katalin"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Munkakör / Megnevezés</label>
              <Input
                placeholder="Pl. Mesterfodrász & Szín specialist"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">E-mail cím</label>
                <Input
                  type="email"
                  placeholder="kata@domain.hu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Telefonszám</label>
                <Input
                  placeholder="+36 30 123 4567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Jogosultsági szint</label>
              <Select value={formAccessRole} onValueChange={(val: any) => setFormAccessRole(val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Munkatárs (Csak saját naptár és vendégek)</SelectItem>
                  <SelectItem value="admin">Adminisztrátor (Teljes hozzáférés)</SelectItem>
                  <SelectItem value="owner">Tulajdonos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Munkarend / Nyitvatartás</label>
              <Input
                placeholder="Pl. Hétfő - Péntek: 09:00 - 17:00"
                value={formWorkingHours}
                onChange={(e) => setFormWorkingHours(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
              Mégse
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
