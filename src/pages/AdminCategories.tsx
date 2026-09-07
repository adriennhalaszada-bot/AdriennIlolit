import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { getSortedCategoryTree, sortCategoriesABC, CategoryNode, CategorySuggestion } from "@/data/categoriesData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderPlus, Plus, Trash2, Edit3, CheckCircle2, XCircle, ChevronRight, ChevronDown,
  Layers, Bell, Sparkles, RefreshCw, Search
} from "lucide-react";

export function AdminCategoriesPage() {
  const { toast } = useToast();
  const [tree, setTree] = useState<CategoryNode[]>(() => getSortedCategoryTree());
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [addLevel, setAddLevel] = useState<1 | 2 | 3>(1);
  const [selectedParentL1Id, setSelectedParentL1Id] = useState("");
  const [selectedParentL2Id, setSelectedParentL2Id] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏷️");

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/admin/category-suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (e) {
      console.warn("API offline, using mock suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const level1Nodes = tree;
  const level1ParentObj = tree.find((c) => c.id === selectedParentL1Id);
  const level2Nodes = level1ParentObj?.children || [];

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      toast({ title: "Kérjük add meg a kategória nevét!", variant: "destructive" });
      return;
    }

    const name = newCatName.trim();
    const updatedTree = [...tree];

    if (addLevel === 1) {
      const newL1Node: CategoryNode = {
        id: `cat_l1_${Date.now()}`,
        name,
        level: 1,
        parentId: null,
        icon: newCatIcon || "🏷️",
        children: [],
      };
      updatedTree.push(newL1Node);
    } else if (addLevel === 2) {
      if (!selectedParentL1Id) {
        toast({ title: "Válassz Fő kategóriát (Level 1) szülőként!", variant: "destructive" });
        return;
      }
      const l1 = updatedTree.find((c) => c.id === selectedParentL1Id);
      if (l1) {
        l1.children = l1.children || [];
        l1.children.push({
          id: `cat_l2_${Date.now()}`,
          name,
          level: 2,
          parentId: l1.id,
          children: [],
        });
      }
    } else if (addLevel === 3) {
      if (!selectedParentL1Id || !selectedParentL2Id) {
        toast({ title: "Válassz Fő kategóriát és Al-kategóriát szülőként!", variant: "destructive" });
        return;
      }
      const l1 = updatedTree.find((c) => c.id === selectedParentL1Id);
      const l2 = l1?.children?.find((c) => c.id === selectedParentL2Id);
      if (l2) {
        l2.children = l2.children || [];
        l2.children.push({
          id: `cat_l3_${Date.now()}`,
          name,
          level: 3,
          parentId: l2.id,
        });
      }
    }

    // Automatically re-sort strictly in Hungarian ABC order!
    const sorted = sortCategoriesABC(updatedTree);
    setTree(sorted);

    toast({
      title: "✅ Kategória Hozzáadva!",
      description: `A(z) "${name}" kategória automatikusan beillesztve a pontos ABC helyére.`,
    });

    setNewCatName("");
  };

  const handleDeleteCategory = (id: string) => {
    const filterNodes = (nodes: CategoryNode[]): CategoryNode[] => {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          children: n.children ? filterNodes(n.children) : undefined,
        }));
    };
    const updated = filterNodes(tree);
    setTree(sortCategoriesABC(updated));
    toast({ title: "Kategória törölve." });
  };

  const handleApproveSuggestion = async (sug: CategorySuggestion) => {
    // Auto insert into ABC tree
    const l1Name = sug.suggestedLevel1.trim();
    const l2Name = (sug.suggestedLevel2 || "Általános").trim();
    const l3Name = (sug.suggestedLevel3 || "Egyéb kiegészítők").trim();

    const updatedTree = [...tree];
    let l1 = updatedTree.find((c) => c.name.toLowerCase() === l1Name.toLowerCase());

    if (!l1) {
      l1 = {
        id: `cat_l1_${Date.now()}`,
        name: l1Name,
        level: 1,
        parentId: null,
        icon: "✨",
        children: [],
      };
      updatedTree.push(l1);
    }

    let l2 = (l1.children || []).find((c) => c.name.toLowerCase() === l2Name.toLowerCase());
    if (!l2) {
      l2 = {
        id: `cat_l2_${Date.now()}`,
        name: l2Name,
        level: 2,
        parentId: l1.id,
        children: [],
      };
      l1.children = l1.children || [];
      l1.children.push(l2);
    }

    const l3Exists = (l2.children || []).some((c) => c.name.toLowerCase() === l3Name.toLowerCase());
    if (!l3Exists) {
      l2.children = l2.children || [];
      l2.children.push({
        id: `cat_l3_${Date.now()}`,
        name: l3Name,
        level: 3,
        parentId: l2.id,
      });
    }

    setTree(sortCategoriesABC(updatedTree));

    // Update suggestion status
    setSuggestions((prev) =>
      prev.map((s) => (s.id === sug.id ? { ...s, status: "APPROVED" } : s))
    );

    try {
      await fetch(`/api/admin/category-suggestions/${sug.id}/approve`, { method: "POST" });
    } catch (e) {}

    toast({
      title: "🎉 Kategória Javaslat Jóváhagyva!",
      description: `A(z) "${l1Name} → ${l2Name} → ${l3Name}" kategória felvéve és ABC sorrendbe rendezve.`,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-purple-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-violet-700/40">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-violet-500/30 text-violet-200 border border-violet-400/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5 text-violet-300" /> Adminisztrátori Kategóriakezelő
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">3 Szintű ABC Kategóriarendszer</h1>
            <p className="text-xs sm:text-sm text-violet-200 mt-1 max-w-2xl">
              Átlátható, szigorúan 3 szintű (Fő → Al → Al-al), magyar ABC-rendezett, AI-mentes termékkategória struktúra valós idejű adminisztrátori bővítéssel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={fetchSuggestions}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Frissítés
            </Button>
          </div>
        </div>

        {/* Pending Suggestions Notification Panel */}
        {suggestions.filter((s) => s.status === "PENDING").length > 0 && (
          <Card className="p-6 bg-amber-500/10 border-amber-500/30 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600 animate-bounce" />
                <h3 className="font-extrabold text-base text-amber-900 dark:text-amber-300">
                  Beérkezett Kategória Kérések Eladóktól ({suggestions.filter((s) => s.status === "PENDING").length} db)
                </h3>
              </div>
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-100 font-bold">
                Admin Értesítések
              </Badge>
            </div>

            <div className="grid gap-3">
              {suggestions
                .filter((s) => s.status === "PENDING")
                .map((sug) => (
                  <div key={sug.id} className="bg-background p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-violet-600 dark:text-violet-400">
                        👤 Eladó: {sug.sellerName} ({sug.sellerEmail || "nincs megadva"})
                      </div>
                      <div className="font-black text-sm text-foreground">
                        Kért struktúra: <span className="text-violet-600">{sug.suggestedLevel1}</span>
                        {sug.suggestedLevel2 && <span> → {sug.suggestedLevel2}</span>}
                        {sug.suggestedLevel3 && <span> → {sug.suggestedLevel3}</span>}
                      </div>
                      {sug.notes && <p className="text-xs text-muted-foreground">💬 Megjegyzés: {sug.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveSuggestion(sug)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Jóváhagyás & ABC Beillesztés
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Add New Category Panel */}
          <Card className="p-6 space-y-5 rounded-3xl border shadow-xs lg:col-span-1">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-violet-600" /> Új Kategória Hozzáadása
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Válaszd ki a szintet. Hozzáadáskor a kategória automatikusan a pontos magyar ABC szerinti helyére kerül!
              </p>
            </div>

            {/* Level Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">1. Kategória Szintje</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setAddLevel(1)}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${addLevel === 1 ? "bg-violet-600 text-white shadow-xs" : "text-muted-foreground"}`}
                >
                  Level 1 (Fő)
                </button>
                <button
                  type="button"
                  onClick={() => setAddLevel(2)}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${addLevel === 2 ? "bg-violet-600 text-white shadow-xs" : "text-muted-foreground"}`}
                >
                  Level 2 (Al)
                </button>
                <button
                  type="button"
                  onClick={() => setAddLevel(3)}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${addLevel === 3 ? "bg-violet-600 text-white shadow-xs" : "text-muted-foreground"}`}
                >
                  Level 3 (Al-al)
                </button>
              </div>
            </div>

            {/* Parent Level 1 selection */}
            {addLevel >= 2 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">2. Szülő Fő kategória (Level 1) *</label>
                <Select value={selectedParentL1Id} onValueChange={(v) => { setSelectedParentL1Id(v); setSelectedParentL2Id(""); }}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold"><SelectValue placeholder="Válassz Fő kategóriát..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {level1Nodes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="font-bold">
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parent Level 2 selection */}
            {addLevel === 3 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">3. Szülő Al-kategória (Level 2) *</label>
                <Select value={selectedParentL2Id} onValueChange={setSelectedParentL2Id} disabled={!selectedParentL1Id}>
                  <SelectTrigger className="rounded-xl text-xs font-semibold"><SelectValue placeholder="Válassz Al-kategóriát..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {level2Nodes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Új Kategória Neve *</label>
              <Input
                placeholder="pl. SPORTESZKÖZÖK, Csizmák..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="rounded-xl text-xs font-semibold"
              />
            </div>

            {addLevel === 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Ikon (Emoji)</label>
                <Input
                  placeholder="pl. ⚽"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            )}

            <Button onClick={handleAddCategory} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs py-2.5">
              <Plus className="w-4 h-4 mr-1" /> Hozzáadás ABC Sorrendbe
            </Button>
          </Card>

          {/* 3-Level Tree Inspector */}
          <Card className="p-6 space-y-4 rounded-3xl border shadow-xs lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <span>🌳 Aktív 3 Szintű ABC Kategóriafa</span>
                  <Badge variant="secondary" className="text-xs font-bold">{tree.length} Fő kategória</Badge>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Minden szinten szigorúan magyar ABC sorrendben (`localeCompare('hu')`).
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Kategória kereső..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Tree View */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {tree.map((l1) => {
                const matchesL1 = l1.name.toLowerCase().includes(searchTerm.toLowerCase());
                return (
                  <div key={l1.id} className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                    {/* Level 1 Header */}
                    <div className="p-3 bg-muted/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{l1.icon}</span>
                        <span className="font-black text-sm text-foreground uppercase">{l1.name}</span>
                        <Badge className="bg-violet-600 text-white text-[10px] font-bold">Level 1 (Fő)</Badge>
                        <span className="text-xs text-muted-foreground font-semibold">({l1.children?.length || 0} al-kategória)</span>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(l1.id)}
                        className="text-rose-600 hover:bg-rose-50 h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Level 2 Sub-items */}
                    {(l1.children || []).length > 0 && (
                      <div className="p-3 space-y-2.5 bg-background border-t border-border">
                        {l1.children?.map((l2) => (
                          <div key={l2.id} className="p-2.5 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-foreground">{l2.name}</span>
                                <Badge variant="outline" className="border-indigo-400 text-indigo-700 text-[9px] font-bold">Level 2 (Al)</Badge>
                                <span className="text-[10px] text-muted-foreground">({l2.children?.length || 0} al-alkategória)</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCategory(l2.id)}
                                className="text-rose-600 hover:bg-rose-50 h-6 w-6 p-0 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Level 3 Sub-sub items */}
                            {(l2.children || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1 pl-2 border-l-2 border-violet-500/30">
                                {l2.children?.map((l3) => (
                                  <div
                                    key={l3.id}
                                    className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg text-xs font-medium hover:border-violet-400 transition"
                                  >
                                    <span className="text-violet-600">📌</span>
                                    <span>{l3.name}</span>
                                    <Badge variant="secondary" className="text-[8px] px-1 py-0 font-mono">L3</Badge>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(l3.id)}
                                      className="text-muted-foreground hover:text-rose-600 ml-1 cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
