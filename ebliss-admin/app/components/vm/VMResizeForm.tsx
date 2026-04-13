// components/vm/VMResizeForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Server, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Slider } from '../ui/slider'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { useToast } from '../../../hooks/use-toast'
import { api } from '@/lib/api'
import { VM, Plan } from './types'

interface VMResizeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vm: VM
  onSuccess: () => void
}

export function VMResizeForm({ open, onOpenChange, vm, onSuccess }: VMResizeFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number>(vm.plan_id)
  const [customSpecs, setCustomSpecs] = useState({
    vcpu: vm.vcpu,
    ram_gb: vm.ram_gb,
    ssd_gb: vm.ssd_gb,
  })
  const [resizeMode, setResizeMode] = useState<'plan' | 'custom'>('plan')
  const [nodeLimits, setNodeLimits] = useState({
    max_vcpu: 64,
    max_ram_gb: 256,
    max_storage_gb: 2000,
    available_vcpu: 32,
    available_ram_gb: 128,
    available_storage_gb: 1000,
  })
  
  const { toast } = useToast()

  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const currentPlan = plans.find(p => p.id === vm.plan_id)

  useEffect(() => {
    if (open) {
      fetchPlans()
      fetchNodeLimits()
    }
  }, [open, vm.id])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/plans')
      setPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNodeLimits = async () => {
    try {
      const response = await api.get(`/admin/nodes/${vm.node_id}/stats`)
      const stats = response.data
      const node = await api.get(`/admin/nodes/${vm.node_id}`)
      
      setNodeLimits({
        max_vcpu: node.data.max_vcpu,
        max_ram_gb: node.data.max_ram_gb,
        max_storage_gb: node.data.max_storage_gb,
        available_vcpu: node.data.max_vcpu - stats.used_vcpu + vm.vcpu,
        available_ram_gb: node.data.max_ram_gb - stats.used_ram_gb + vm.ram_gb,
        available_storage_gb: node.data.max_storage_gb - stats.used_storage_gb + vm.ssd_gb,
      })
    } catch (error) {
      console.error('Failed to fetch node limits:', error)
    }
  }

  const handlePlanSelect = (planId: number) => {
    setSelectedPlanId(planId)
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      setCustomSpecs({
        vcpu: plan.vcpu,
        ram_gb: plan.ram_gb,
        ssd_gb: plan.ssd_gb,
      })
    }
  }
const formatRate = (rate: any): string => {
  if (rate === null || rate === undefined) return '0.0000';
  
  const numRate = typeof rate === 'string' ? parseFloat(rate) : 
                  typeof rate === 'object' && rate !== null && 'toNumber' in rate && typeof (rate as any).toNumber === 'function' ? (rate as any).toNumber() : 
                  Number(rate);
  
  return numRate.toFixed(4);
};

const calculatePriceDifference = () => {
  const currentRate = typeof vm.hourly_rate === 'string' 
    ? parseFloat(vm.hourly_rate) 
    : typeof vm.hourly_rate === 'object' && vm.hourly_rate !== null && 'toNumber' in vm.hourly_rate && typeof (vm.hourly_rate as any).toNumber === 'function'
      ? (vm.hourly_rate as any).toNumber() 
      : Number(vm.hourly_rate) || 0;
  
  let newRate: number;
  if (resizeMode === 'plan' && selectedPlan) {
    newRate = selectedPlan.type === 'hourly' 
      ? (typeof selectedPlan.hourly_price === 'string' ? parseFloat(selectedPlan.hourly_price) : Number(selectedPlan.hourly_price) || 0)
      : (typeof selectedPlan.monthly_price === 'string' ? parseFloat(selectedPlan.monthly_price) : Number(selectedPlan.monthly_price) || 0) / 720;
  } else {
    const cpuPrice = customSpecs.vcpu * 0.02;
    const ramPrice = customSpecs.ram_gb * 0.01;
    const storagePrice = customSpecs.ssd_gb * 0.001;
    newRate = cpuPrice + ramPrice + storagePrice;
  }
  
  const diff = newRate - currentRate;
  return {
    current: currentRate,
    new: newRate,
    diff,
    percentage: currentRate > 0 ? ((diff / currentRate) * 100) : 0,
  };
};

  const priceDiff = calculatePriceDifference()

  const canResize = () => {
    if (vm.status !== 'stopped') {
      return { allowed: false, reason: 'VM must be stopped to resize' }
    }
    
    if (customSpecs.vcpu > nodeLimits.available_vcpu) {
      return { allowed: false, reason: `Only ${nodeLimits.available_vcpu} vCPUs available on this node` }
    }
    
    if (customSpecs.ram_gb > nodeLimits.available_ram_gb) {
      return { allowed: false, reason: `Only ${nodeLimits.available_ram_gb} GB RAM available on this node` }
    }
    
    if (customSpecs.ssd_gb < vm.ssd_gb) {
      return { allowed: false, reason: 'Cannot reduce storage size' }
    }
    
    if (customSpecs.ssd_gb > nodeLimits.available_storage_gb) {
      return { allowed: false, reason: `Only ${nodeLimits.available_storage_gb} GB storage available on this node` }
    }
    
    return { allowed: true, reason: '' }
  }

  const resizeCheck = canResize()

  const handleSubmit = async () => {
    if (!resizeCheck.allowed) {
      toast({
        title: 'Cannot Resize',
        description: resizeCheck.reason,
        variant: 'destructive',
      })
      return
    }
    
    setSubmitting(true)
    try {
      await api.post(`/admin/vms/${vm.id}/resize`, customSpecs)
      
      toast({
        title: 'Success',
        description: `VM "${vm.name}" resize initiated successfully`,
      })
      
      onSuccess()
    } catch (error: any) {
      console.error('Failed to resize VM:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resize VM',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[10000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Resize Virtual Machine
          </DialogTitle>
          <DialogDescription>
            Resize "{vm.name}" - Current: {vm.vcpu} vCPU / {vm.ram_gb} GB RAM / {vm.ssd_gb} GB SSD
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Status Warning */}
            {vm.status !== 'stopped' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  VM must be stopped before resizing. Current status: <Badge variant="destructive">{vm.status}</Badge>
                </AlertDescription>
              </Alert>
            )}

            {/* Resize Mode */}
            <div className="flex gap-2 border-b pb-4">
              <Button
                variant={resizeMode === 'plan' ? 'default' : 'outline'}
                onClick={() => setResizeMode('plan')}
                size="sm"
              >
                Use Plan
              </Button>
              <Button
                variant={resizeMode === 'custom' ? 'default' : 'outline'}
                onClick={() => setResizeMode('custom')}
                size="sm"
              >
                Custom Specs
              </Button>
            </div>

            {resizeMode === 'plan' ? (
              <div className="space-y-3">
                <Label>Select New Plan</Label>
                <Select 
                  value={selectedPlanId.toString()} 
                  onValueChange={(value) => handlePlanSelect(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001] max-h-80">
                    {plans.filter(p => p.is_active).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="text-xs text-gray-500">
                            {plan.vcpu} vCPU / {plan.ram_gb} GB / {plan.ssd_gb} GB
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedPlan && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-3">{selectedPlan.name}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">vCPU</Label>
                        <p className="text-lg font-semibold">{selectedPlan.vcpu}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">RAM</Label>
                        <p className="text-lg font-semibold">{selectedPlan.ram_gb} GB</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Storage</Label>
                        <p className="text-lg font-semibold">{selectedPlan.ssd_gb} GB</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* vCPU Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="flex items-center gap-1">
                      <Cpu className="h-4 w-4" />
                      vCPU Cores
                    </Label>
                    <span className="font-medium">{customSpecs.vcpu} cores</span>
                  </div>
                  <Slider
                    value={[customSpecs.vcpu]}
                    onValueChange={([value]) => setCustomSpecs({ ...customSpecs, vcpu: value })}
                    min={1}
                    max={Math.min(nodeLimits.max_vcpu, nodeLimits.available_vcpu)}
                    step={1}
                    disabled={vm.status !== 'stopped'}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: 1</span>
                    <span>Available: {nodeLimits.available_vcpu}</span>
                    <span>Max: {nodeLimits.max_vcpu}</span>
                  </div>
                </div>

                {/* RAM Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="flex items-center gap-1">
                      <MemoryStick className="h-4 w-4" />
                      RAM
                    </Label>
                    <span className="font-medium">{customSpecs.ram_gb} GB</span>
                  </div>
                  <Slider
                    value={[customSpecs.ram_gb]}
                    onValueChange={([value]) => setCustomSpecs({ ...customSpecs, ram_gb: value })}
                    min={1}
                    max={Math.min(nodeLimits.max_ram_gb, nodeLimits.available_ram_gb)}
                    step={1}
                    disabled={vm.status !== 'stopped'}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: 1 GB</span>
                    <span>Available: {nodeLimits.available_ram_gb} GB</span>
                    <span>Max: {nodeLimits.max_ram_gb} GB</span>
                  </div>
                </div>

                {/* Storage Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      Storage
                    </Label>
                    <span className="font-medium">{customSpecs.ssd_gb} GB</span>
                  </div>
                  <Slider
                    value={[customSpecs.ssd_gb]}
                    onValueChange={([value]) => setCustomSpecs({ ...customSpecs, ssd_gb: value })}
                    min={vm.ssd_gb}
                    max={Math.min(nodeLimits.max_storage_gb, nodeLimits.available_storage_gb)}
                    step={10}
                    disabled={vm.status !== 'stopped'}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Current: {vm.ssd_gb} GB</span>
                    <span>Available: {nodeLimits.available_storage_gb} GB</span>
                    <span>Max: {nodeLimits.max_storage_gb} GB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Price Comparison */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Change
              </h4>
              <div className="flex items-center justify-between">
                <div>
  <p className="text-sm text-gray-600">Current Rate</p>
  <p className="text-xl font-semibold">${formatRate(vm.hourly_rate)}/hr</p>
</div>
                <div className="text-2xl">
                  {priceDiff.diff > 0 ? (
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  ) : priceDiff.diff < 0 ? (
                    <TrendingDown className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
                <div>
  <p className="text-sm text-gray-600">New Rate</p>
  <p className="text-xl font-semibold">${formatRate(priceDiff.new)}/hr</p>
</div>

              </div>
              {priceDiff.diff !== 0 && (
                <p className={`text-sm mt-2 ${priceDiff.diff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {priceDiff.diff > 0 ? '+' : ''}{priceDiff.percentage.toFixed(1)}% 
                  (${Math.abs(priceDiff.diff).toFixed(4)}/hr)
                </p>
              )}
            </div>

            {/* Resource Availability Warning */}
            {!resizeCheck.allowed && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{resizeCheck.reason}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700" 
            onClick={handleSubmit}
            disabled={loading || submitting || !resizeCheck.allowed}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Resizing...
              </>
            ) : (
              'Confirm Resize'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}