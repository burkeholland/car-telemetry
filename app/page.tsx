"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">UI Scaffold Demo</h1>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><Badge variant="secondary">Status OK</Badge></div>
              </TooltipTrigger>
              <TooltipContent>Example tooltip.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ModeToggle />
        </div>
      </header>
      <Separator />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button>Primary Button</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={switchOn} onCheckedChange={(v: boolean) => setSwitchOn(v)} />
                  <span className="text-sm text-muted-foreground">Toggle example ({switchOn ? 'on' : 'off'})</span>
                </div>
                <Progress value={42} />
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <h2 className="text-lg font-semibold mb-2">Dialog Title</h2>
                    <p className="text-sm text-muted-foreground mb-4">This dialog demonstrates the Radix Dialog primitive styling.</p>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Scroll & Skeleton</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 rounded-md border p-2 space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>These primitives form the design system foundation for the telemetry dashboard.</p>
              <p>Next steps: implement core types & simulation engine (Plan Step 2+3).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
