'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Server, Cpu, HardDrive, Wifi, Globe } from 'lucide-react';
import { LayoutWrapper } from '../../components/layout/LayoutWrapper';
import { createServer } from '../../lib/dedicated-servers';
import { getAllPOPs } from '../../lib/pops';
import { cn } from '@/lib/utils';

interface Pop {
  id: number;
  name: string;
  city: string;
  country: string;
  active: boolean;
  created_at: string;
  _count?: {
    nodes: number;
    ip_addresses: number;
  };
}
interface StorageConfig {
  type: 'nvme' | 'ssd' | 'hdd';
  size_gb: number;
  raid_level: string;
  drive_count: number;
  is_primary: boolean;
}

export default function CreateServerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingPops, setLoadingPops] = useState(true);
  const [pops, setPops] = useState<Pop[]>([]);
  const [selectedPop, setSelectedPop] = useState<Pop | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'hardware' | 'network' | 'pricing'>('basic');
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    hostname: '',
    datacenter: '',
    pop_id: 0,
    
    // Hardware - CPU
    cpu_model: '',
    cpu_cores: 8,
    cpu_threads: 16,
    cpu_speed: '3.0 GHz',
    
    // Hardware - RAM
    ram_gb: 32,
    ram_type: 'DDR4',
    ram_speed: '3200 MHz',
    
    // Hardware - Storage
    storage: [] as StorageConfig[],
    
    // OS
    os: 'Ubuntu 22.04 LTS',
    os_version: '22.04',
    root_password: '',
    
    // Network
    network_port: '1 Gbps',
    bandwidth_tb: 10,
    ipv4_count: 1,
    ipv6_count: 0,
    
    // Rack Position
    rack_id: '',
    rack_position: '',
    
    // Features
    ddos_protection: false,
    backup_enabled: false,
    monitoring_enabled: true,
    
    // IPMI/KVM
    ipmi_ip: '',
    ipmi_user: '',
    ipmi_password: '',
    kvm_enabled: false,
    kvm_type: '',
    
    // Pricing
    monthly_price: 0,
    setup_fee: 0,
    
    // Notes
    notes: '',
    tags: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

// Fetch POPs on mount
  useEffect(() => {
    const fetchPops = async () => {
      try {
        setLoadingPops(true);
        
        const response = await getAllPOPs();
        const popsData = Array.isArray(response) 
          ? response 
          : (response as any).data || response;

        setPops(popsData.filter((pop: Pop) => pop.active));
        
        // Set default POP if available
        if (popsData.length > 0) {
          const defaultPop = popsData.find((p: Pop) => p.active) || popsData[0];
          setSelectedPop(defaultPop);
          setFormData(prev => ({
            ...prev,
            datacenter: defaultPop.name,
            pop_id: defaultPop.id,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch POPs:', error);
      } finally {
        setLoadingPops(false);
      }
    };
    
    fetchPops();
  }, []);

  const handlePopChange = (popId: string) => {
    const pop = pops.find(p => p.id === parseInt(popId));
    if (pop) {
      setSelectedPop(pop);
      setFormData({
        ...formData,
        datacenter: pop.name,
        pop_id: pop.id,
      });
    }
  };

  const addStorage = () => {
    const newStorage: StorageConfig = {
      type: 'nvme',
      size_gb: 480,
      raid_level: 'RAID 1',
      drive_count: 2,
      is_primary: formData.storage.length === 0,
    };
    setFormData({
      ...formData,
      storage: [...formData.storage, newStorage],
    });
  };

  const updateStorage = (index: number, field: keyof StorageConfig, value: any) => {
    const updated = [...formData.storage];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, storage: updated });
  };

  const removeStorage = (index: number) => {
    const updated = formData.storage.filter((_, i) => i !== index);
    // Ensure at least one primary storage if any remain
    if (updated.length > 0 && !updated.some(s => s.is_primary)) {
      updated[0].is_primary = true;
    }
    setFormData({ ...formData, storage: updated });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Server name is required';
    if (!formData.hostname) newErrors.hostname = 'Hostname is required';
    if (!formData.pop_id) newErrors.pop_id = 'Please select a datacenter';
    if (!formData.cpu_model) newErrors.cpu_model = 'CPU model is required';
    if (formData.ram_gb < 1) newErrors.ram_gb = 'RAM must be at least 1 GB';
    if (formData.monthly_price < 0) newErrors.monthly_price = 'Price must be positive';
    
    // Validate hostname format
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (formData.hostname && !hostnameRegex.test(formData.hostname)) {
      newErrors.hostname = 'Invalid hostname format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorTab = Object.keys(errors)[0];
      if (firstErrorTab === 'name' || firstErrorTab === 'hostname' || firstErrorTab === 'pop_id') {
        setActiveTab('basic');
      } else if (firstErrorTab?.includes('cpu') || firstErrorTab?.includes('ram')) {
        setActiveTab('hardware');
      } else if (firstErrorTab?.includes('monthly_price')) {
        setActiveTab('pricing');
      }
      return;
    }
    
    setLoading(true);

    try {
await createServer(formData as any);
      router.push('/dedicated-servers/list');
    } catch (error: any) {
      console.error('Failed to create server:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create server. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateHostname = () => {
    if (formData.name) {
      const hostname = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData({ ...formData, hostname: `${hostname}.ebliss.cloud` });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, root_password: password });
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: Server },
    { id: 'hardware' as const, label: 'Hardware', icon: Cpu },
    { id: 'network' as const, label: 'Network', icon: Wifi },
    { id: 'pricing' as const, label: 'Pricing', icon: () => <span className="text-sm">₹</span> },
  ];

  const cpuOptions = [
    'Intel Xeon E-2388G',
    'Intel Xeon Silver 4314',
    'Intel Xeon Gold 6248R',
    'Intel Xeon Gold 6348',
    'Intel Xeon Platinum 8380',
    'AMD EPYC 7543',
    'AMD EPYC 9654',
  ];

  const osOptions = [
    'Ubuntu 22.04 LTS',
    'Ubuntu 24.04 LTS',
    'CentOS Stream 9',
    'Debian 12',
    'AlmaLinux 9',
    'Rocky Linux 9',
    'Windows Server 2022',
    'VMware ESXi 8.0',
    'Proxmox VE 8.1',
  ];

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deploy Dedicated Server</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure and deploy a new bare metal server
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Server Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onBlur={generateHostname}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                        errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      )}
                      placeholder="e.g., DELL-740-01"
                    />
                    {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hostname *
                    </label>
                    <input
                      type="text"
                      value={formData.hostname}
                      onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                        errors.hostname ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      )}
                      placeholder="srv1.host02.yta"
                    />
                    {errors.hostname && <p className="text-sm text-red-500 mt-1">{errors.hostname}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Datacenter (POP) *
                  </label>
                  {loadingPops ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 size={16} className="animate-spin" />
                      Loading datacenters...
                    </div>
                  ) : (
                    <select
                      value={formData.pop_id.toString()}
                      onChange={(e) => handlePopChange(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                        errors.pop_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <option value="">Select a datacenter</option>
                      {pops.map((pop) => (
                        <option key={pop.id} value={pop.id}>
                          {pop.name} - {pop.city}, {pop.country}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.pop_id && <p className="text-sm text-red-500 mt-1">{errors.pop_id}</p>}
                  {selectedPop && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Globe size={12} />
                      {selectedPop.city}, {selectedPop.country}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Operating System
                    </label>
                    <select
                      value={formData.os}
                      onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      {osOptions.map(os => (
                        <option key={os} value={os}>{os}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Root Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.root_password}
                        onChange={(e) => setFormData({ ...formData, root_password: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                        placeholder="Auto-generated or custom"
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hardware Tab */}
          {activeTab === 'hardware' && (
            <div className="space-y-6">
              {/* CPU Configuration */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CPU Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Model *
                    </label>
                    <select
                      value={formData.cpu_model}
                      onChange={(e) => setFormData({ ...formData, cpu_model: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                        errors.cpu_model ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      )}
                    >
                      <option value="">Select CPU</option>
                      {cpuOptions.map(cpu => (
                        <option key={cpu} value={cpu}>{cpu}</option>
                      ))}
                    </select>
                    {errors.cpu_model && <p className="text-sm text-red-500 mt-1">{errors.cpu_model}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cores
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.cpu_cores}
                      onChange={(e) => setFormData({ ...formData, cpu_cores: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Threads
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.cpu_threads}
                      onChange={(e) => setFormData({ ...formData, cpu_threads: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clock Speed
                    </label>
                    <input
                      type="text"
                      value={formData.cpu_speed}
                      onChange={(e) => setFormData({ ...formData, cpu_speed: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* RAM Configuration */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RAM (GB) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.ram_gb}
                      onChange={(e) => setFormData({ ...formData, ram_gb: parseInt(e.target.value) || 1 })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                        errors.ram_gb ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                      )}
                    />
                    {errors.ram_gb && <p className="text-sm text-red-500 mt-1">{errors.ram_gb}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RAM Type
                    </label>
                    <select
                      value={formData.ram_type}
                      onChange={(e) => setFormData({ ...formData, ram_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="DDR4">DDR4</option>
                      <option value="DDR5">DDR5</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RAM Speed
                    </label>
                    <input
                      type="text"
                      value={formData.ram_speed}
                      onChange={(e) => setFormData({ ...formData, ram_speed: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Storage Configuration */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Configuration</h2>
                  <button
                    type="button"
                    onClick={addStorage}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    + Add Storage
                  </button>
                </div>
                
                {formData.storage.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No storage configured. Click "Add Storage" to configure.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {formData.storage.map((storage, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Storage #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="primary_storage"
                                checked={storage.is_primary}
                                onChange={() => {
                                  const updated = formData.storage.map((s, i) => ({
                                    ...s,
                                    is_primary: i === index,
                                  }));
                                  setFormData({ ...formData, storage: updated });
                                }}
                                className="text-blue-600"
                              />
                              Primary
                            </label>
                            <button
                              type="button"
                              onClick={() => removeStorage(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                            <select
                              value={storage.type}
                              onChange={(e) => updateStorage(index, 'type', e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            >
                              <option value="nvme">NVMe SSD</option>
                              <option value="ssd">SATA SSD</option>
                              <option value="hdd">HDD</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Size (GB)</label>
                            <input
                              type="number"
                              min="1"
                              value={storage.size_gb}
                              onChange={(e) => updateStorage(index, 'size_gb', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">RAID Level</label>
                            <select
                              value={storage.raid_level}
                              onChange={(e) => updateStorage(index, 'raid_level', e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            >
                              <option value="RAID 0">RAID 0</option>
                              <option value="RAID 1">RAID 1</option>
                              <option value="RAID 5">RAID 5</option>
                              <option value="RAID 6">RAID 6</option>
                              <option value="RAID 10">RAID 10</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Drives</label>
                            <input
                              type="number"
                              min="1"
                              value={storage.drive_count}
                              onChange={(e) => updateStorage(index, 'drive_count', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Port Speed
                  </label>
                  <select
                    value={formData.network_port}
                    onChange={(e) => setFormData({ ...formData, network_port: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="1 Gbps">1 Gbps</option>
                    <option value="10 Gbps">10 Gbps</option>
                    <option value="25 Gbps">25 Gbps</option>
                    <option value="40 Gbps">40 Gbps</option>
                    <option value="100 Gbps">100 Gbps</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bandwidth (TB/month)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.bandwidth_tb}
                    onChange={(e) => setFormData({ ...formData, bandwidth_tb: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    IPv4 Addresses
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ipv4_count}
                    onChange={(e) => setFormData({ ...formData, ipv4_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    IPv6 Addresses
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ipv6_count}
                    onChange={(e) => setFormData({ ...formData, ipv6_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Rack Position</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rack ID
                    </label>
                    <input
                      type="text"
                      value={formData.rack_id}
                      onChange={(e) => setFormData({ ...formData, rack_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="e.g., RACK-A"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rack Position (U)
                    </label>
                    <input
                      type="text"
                      value={formData.rack_position}
                      onChange={(e) => setFormData({ ...formData, rack_position: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="e.g., 12-14"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Features</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ddos_protection}
                      onChange={(e) => setFormData({ ...formData, ddos_protection: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">DDoS Protection</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.backup_enabled}
                      onChange={(e) => setFormData({ ...formData, backup_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enable Backups</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.monitoring_enabled}
                      onChange={(e) => setFormData({ ...formData, monitoring_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enable Monitoring</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                    className={cn(
                      "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                      errors.monthly_price ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                    )}
                  />
                  {errors.monthly_price && <p className="text-sm text-red-500 mt-1">{errors.monthly_price}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Setup Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.setup_fee}
                    onChange={(e) => setFormData({ ...formData, setup_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Price Summary</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Price:</span>
                    <span className="font-medium text-gray-900 dark:text-white">₹{formData.monthly_price.toLocaleString()}</span>
                  </p>
                  {formData.setup_fee > 0 && (
                    <p className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">One-time Setup Fee:</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{formData.setup_fee.toLocaleString()}</span>
                    </p>
                  )}
                  <hr className="my-2 border-gray-300 dark:border-gray-600" />
                  <p className="flex justify-between font-semibold">
                    <span className="text-gray-900 dark:text-white">First Month Total:</span>
                    <span className="text-gray-900 dark:text-white">₹{(formData.monthly_price + formData.setup_fee).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Deploying...' : 'Deploy Server'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </LayoutWrapper>
  );
}