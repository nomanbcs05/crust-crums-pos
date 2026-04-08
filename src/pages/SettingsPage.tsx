import { Store, Receipt, Bell, Lock, Image as ImageIcon, Upload, Users, Plus, Trash2, Download } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [businessName, setBusinessName] = useState('Gen XCloud POS');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [taxId, setTaxId] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your visit! Come back soon!');
  const [billFooter, setBillFooter] = useState('!!!!FOR THE LOVE OF FOOD !!!!');
  const [kitchenPrinterIp, setKitchenPrinterIp] = useState(localStorage.getItem('kitchen_printer_ip') || '192.168.1.150');
  const [cashPrinterIp, setCashPrinterIp] = useState(localStorage.getItem('cash_printer_ip') || '192.168.1.151');
  const [printers, setPrinters] = useState<{ id: string, name: string, ip: string, type: 'kitchen' | 'cash' | 'other' }[]>([]);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterIp, setNewPrinterIp] = useState('');
  const [newPrinterType, setNewPrinterType] = useState<'kitchen' | 'cash' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cashierDisplayName, setCashierDisplayName] = useState(localStorage.getItem('cashier_display_name') || 'Anas');
  const [cashier2Lock, setCashier2Lock] = useState((localStorage.getItem('cashier2_lock') || 'true') === 'true');
  const [ordersPwdRequired, setOrdersPwdRequired] = useState((localStorage.getItem('orders_pwd_required') || 'true') === 'true');
  const [ordersActionPwd, setOrdersActionPwd] = useState(localStorage.getItem('orders_action_pwd') || '');

  // Staff management state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('rider');

  const { data: staffListStr } = useQuery({
    queryKey: ['settings', 'staff_list'],
    queryFn: () => api.settings.get('staff_list'),
  });

  const staffList = (staffListStr ? JSON.parse(staffListStr) : []) as { name: string, role: string }[];

  const updateStaffMutation = useMutation({
    mutationFn: (newList: any[]) => api.settings.set('staff_list', JSON.stringify(newList)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'staff_list'] });
      toast.success('Staff list updated');
    }
  });

  const handleAddStaff = () => {
    if (!newStaffName) return;
    const newList = [...staffList, { name: newStaffName, role: newStaffRole }];
    updateStaffMutation.mutate(newList);
    setNewStaffName('');
  };

  const handleRemoveStaff = (index: number) => {
    const newList = staffList.filter((_, i) => i !== index);
    updateStaffMutation.mutate(newList);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const keys = [
          'business_name', 'phone', 'address', 'city', 'tax_id', 
          'website', 'email', 'logo_url', 'receipt_footer', 'bill_footer',
          'kitchen_printer_ip', 'cash_printer_ip', 'cashier_display_name', 'cashier2_lock',
          'orders_pwd_required', 'orders_action_pwd', 'printers'
        ];
        
        for (const key of keys) {
          const v = await api.settings.get(key);
          if (v !== null) {
            switch(key) {
              case 'business_name': setBusinessName(v); break;
              case 'phone': setPhone(v); break;
              case 'address': setAddress(v); break;
              case 'city': setCity(v); break;
              case 'tax_id': setTaxId(v); break;
              case 'website': setWebsite(v); break;
              case 'email': setEmail(v); break;
              case 'logo_url': setLogoUrl(v); break;
              case 'receipt_footer': setReceiptFooter(v); break;
              case 'bill_footer': setBillFooter(v); break;
              case 'kitchen_printer_ip': setKitchenPrinterIp(v); break;
              case 'cash_printer_ip': setCashPrinterIp(v); break;
              case 'cashier_display_name': setCashierDisplayName(v); break;
              case 'cashier2_lock': setCashier2Lock(v === 'true'); break;
              case 'orders_pwd_required': setOrdersPwdRequired(v === 'true'); break;
              case 'orders_action_pwd': setOrdersActionPwd(v); break;
              case 'printers': 
                try {
                  setPrinters(JSON.parse(v));
                } catch(e) {
                  console.error("Failed to parse printers", e);
                }
                break;
            }
          }
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    loadSettings();
    
    // Also load from localStorage for offline/immediate use
    const storedPrinters = localStorage.getItem('printers');
    if (storedPrinters) {
      try {
        setPrinters(JSON.parse(storedPrinters));
      } catch(e) {}
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const saveSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string, value: string }) => api.settings.set(key, value),
    onSuccess: () => toast.success('Setting saved'),
    onError: () => toast.error('Failed to save setting')
  });

  const saveAllBusiness = () => {
    saveSettingMutation.mutate({ key: 'business_name', value: businessName });
    saveSettingMutation.mutate({ key: 'phone', value: phone });
    saveSettingMutation.mutate({ key: 'address', value: address });
    saveSettingMutation.mutate({ key: 'city', value: city });
    saveSettingMutation.mutate({ key: 'tax_id', value: taxId });
    saveSettingMutation.mutate({ key: 'website', value: website });
    saveSettingMutation.mutate({ key: 'email', value: email });
  };

  const saveAllReceipt = () => {
    saveSettingMutation.mutate({ key: 'logo_url', value: logoUrl });
    saveSettingMutation.mutate({ key: 'receipt_footer', value: receiptFooter });
    saveSettingMutation.mutate({ key: 'bill_footer', value: billFooter });
    saveSettingMutation.mutate({ key: 'kitchen_printer_ip', value: kitchenPrinterIp });
    saveSettingMutation.mutate({ key: 'cash_printer_ip', value: cashPrinterIp });
    saveSettingMutation.mutate({ key: 'printers', value: JSON.stringify(printers) });
    localStorage.setItem('kitchen_printer_ip', kitchenPrinterIp);
    localStorage.setItem('cash_printer_ip', cashPrinterIp);
    localStorage.setItem('printers', JSON.stringify(printers));
  };

  const handleAddPrinter = () => {
    if (!newPrinterName || !newPrinterIp) {
      toast.error('Please enter printer name and IP');
      return;
    }
    const newPrinter = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPrinterName,
      ip: newPrinterIp,
      type: newPrinterType
    };
    setPrinters([...printers, newPrinter]);
    setNewPrinterName('');
    setNewPrinterIp('');
  };

  const handleRemovePrinter = (id: string) => {
    setPrinters(printers.filter(p => p.id !== id));
  };

  const changePasswordMutation = useMutation({
    mutationFn: (pwd: string) => api.profiles.changePassword(pwd),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate(newPassword);
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for logo upload logic in standalone mode
    toast.info("Logo upload will be implemented in a future update");
  };

  return (
    <MainLayout>
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your POS system configuration</p>
          </div>

          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="tax">Tax & Payment</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Management
                  </CardTitle>
                  <CardDescription>
                    Manage your riders and other staff members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Staff Name</Label>
                      <Input 
                        placeholder="Enter name" 
                        value={newStaffName} 
                        onChange={(e) => setNewStaffName(e.target.value)} 
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Role</Label>
                      <select 
                        className="w-full border rounded-md h-10 px-3"
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value)}
                      >
                        <option value="rider">Rider</option>
                        <option value="waiter">Waiter</option>
                        <option value="chef">Chef</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <Button onClick={handleAddStaff}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {staffList.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No staff added yet.</p>
                    ) : (
                      staffList.map((staff, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                          <div>
                            <p className="font-bold uppercase">{staff.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{staff.role}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveStaff(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="business">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Download className="h-5 w-5" />
                    App Installation
                  </CardTitle>
                  <CardDescription>
                    Install the POS app on your device for offline use and quick access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isInstallable ? (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                      <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full">
                        <Download className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">App Already Installed or Not Supported</p>
                        <p className="text-sm text-emerald-600">The app is already installed or your browser does not support installation prompts.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6 py-4 text-center">
                      <div className="bg-blue-50 text-blue-600 p-3 rounded-full animate-bounce">
                        <Download className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Install POS Desktop App</h3>
                        <p className="text-muted-foreground mb-4">Run Gen X POS as a standalone application for the best experience.</p>
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={handleInstallApp}>
                          <Download className="h-5 w-5 mr-2" />
                          Install Now
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Update your restaurant details that appear on receipts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City & State</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={saveAllBusiness}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receipt">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how your receipts look and print
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Logo URL
                      </Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://your-cdn.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This image will appear on printed bills and receipts.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploadingLogo ? 'Uploading…' : 'Upload Logo'}
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-print receipts</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically print when order is completed
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show QR code</p>
                        <p className="text-sm text-muted-foreground">
                          Display QR code for digital receipt
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Footer Message</Label>
                    <Input
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bill Footer (Kitchen / 80mm)</Label>
                    <Input
                      value={billFooter}
                      onChange={(e) => setBillFooter(e.target.value)}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kitchenPrinterIp">Kitchen Printer IP</Label>
                      <Input
                        id="kitchenPrinterIp"
                        placeholder="e.g. 192.168.1.150"
                        value={kitchenPrinterIp}
                        onChange={(e) => setKitchenPrinterIp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashPrinterIp">Cash Printer IP</Label>
                      <Input
                        id="cashPrinterIp"
                        placeholder="e.g. 192.168.1.151"
                        value={cashPrinterIp}
                        onChange={(e) => setCashPrinterIp(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the default IP addresses for your kitchen and cash printers.
                  </p>

                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Additional Printers</h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Printer Name</Label>
                        <Input 
                          placeholder="Kitchen 2 / Juice Bar" 
                          value={newPrinterName} 
                          onChange={(e) => setNewPrinterName(e.target.value)} 
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>IP Address</Label>
                        <Input 
                          placeholder="192.168.1.X" 
                          value={newPrinterIp} 
                          onChange={(e) => setNewPrinterIp(e.target.value)} 
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Type</Label>
                        <select 
                          className="w-full border rounded-md h-10 px-3"
                          value={newPrinterType}
                          onChange={(e) => setNewPrinterType(e.target.value as any)}
                        >
                          <option value="kitchen">Kitchen</option>
                          <option value="cash">Cash</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <Button onClick={handleAddPrinter}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {printers.map((printer) => (
                        <div key={printer.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                          <div>
                            <p className="font-bold uppercase">{printer.name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{printer.ip} ({printer.type})</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemovePrinter(printer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={saveAllReceipt}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Tax & Payment Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tax rates and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input id="taxRate" type="number" defaultValue="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxName">Tax Name</Label>
                      <Input id="taxName" defaultValue="Sales Tax" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Enabled Payment Methods</h3>
                    <div className="flex items-center justify-between">
                      <p>Cash</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <p>Credit/Debit Card</p>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={() => toast.success("Tax settings saved locally")}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Configure alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Low stock alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when products are running low
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={() => toast.success("Notification settings saved locally")}>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Keep your account secure by changing your password regularly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Min. 6 characters" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Roles & Locks
                  </CardTitle>
                  <CardDescription>
                    Set Casher card label, limit Casher navigation, and protect order actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Cashier Display Name</Label>
                    <Input value={cashierDisplayName} onChange={(e) => setCashierDisplayName(e.target.value)} />
                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          const value = cashierDisplayName || 'Anas';
                          setCashierDisplayName(value);
                          saveSettingMutation.mutate({ key: 'cashier_display_name', value });
                          localStorage.setItem('cashier_display_name', value);
                          localStorage.setItem('cashier2_label', value);
                        }}
                      >
                        Save Display Name
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lock Casher Navigation</p>
                      <p className="text-sm text-muted-foreground">
                        Limit Casher to Dashboard, Running Orders, and Orders
                      </p>
                    </div>
                    <Switch
                      checked={cashier2Lock}
                      onCheckedChange={(v) => {
                        setCashier2Lock(v);
                        saveSettingMutation.mutate({ key: 'cashier2_lock', value: String(v) });
                        localStorage.setItem('cashier2_lock', String(v));
                      }}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require Password for Orders Actions</p>
                      <p className="text-sm text-muted-foreground">
                        Ask password before printing summaries or clearing history
                      </p>
                    </div>
                    <Switch
                      checked={ordersPwdRequired}
                      onCheckedChange={(v) => {
                        setOrdersPwdRequired(v);
                        saveSettingMutation.mutate({ key: 'orders_pwd_required', value: String(v) });
                        localStorage.setItem('orders_pwd_required', String(v));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Orders Actions Password</Label>
                    <Input
                      type="password"
                      value={ordersActionPwd}
                      onChange={(e) => setOrdersActionPwd(e.target.value)}
                    />
                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          saveSettingMutation.mutate({ key: 'orders_action_pwd', value: ordersActionPwd || '' });
                          localStorage.setItem('orders_action_pwd', ordersActionPwd || '');
                        }}
                      >
                        Save Password
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </MainLayout>
  );
};

export default SettingsPage;
