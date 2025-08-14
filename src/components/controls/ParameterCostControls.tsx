// src/components/controls/ParameterCostControls.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Card, Slider, InputNumber, Space, Button, Tooltip, Collapse, Badge } from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger, usePerformanceTimer } from '@/utils/logger';
import { DEFAULT_THRESHOLDS, DEFAULT_COSTS } from '@/types/calculations';
import type { Thresholds, Costs } from '@/types/calculations';
import styles from './ParameterCostControls.module.css';

const { Panel } = Collapse;

interface SliderGroupProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  tooltip?: string;
  onChange: (value: number) => void;
  marks?: Record<number, string>;
}

const SliderGroup: React.FC<SliderGroupProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  tooltip,
  onChange,
  marks,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: number | null) => {
    if (newValue !== null) {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  return (
    <div className={styles.sliderGroup}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>
          {label}
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined className={styles.infoIcon} />
            </Tooltip>
          )}
        </span>
        <InputNumber
          className={styles.sliderInput}
          value={localValue}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          formatter={(val) => `${val}${unit}`}
          parser={(val) => val?.replace(unit, '') as unknown as number}
        />
      </div>
      <Slider
        value={localValue}
        min={min}
        max={max}
        step={step}
        marks={marks}
        onChange={setLocalValue}
        onAfterChange={onChange}
        tooltip={{
          formatter: (val) => `${val}${unit}`,
        }}
      />
    </div>
  );
};

export const ParameterCostControls: React.FC = () => {
  const logger = useComponentLogger('ParameterCostControls');
  const perfTimer = usePerformanceTimer('ParameterUpdate');
  
  // Get state from store
  const thresholds = useAnalyticsStore(state => state.parameters.thresholds);
  const costs = useAnalyticsStore(state => state.parameters.costs);
  const updateThresholds = useAnalyticsStore(state => state.updateThresholds);
  const updateCosts = useAnalyticsStore(state => state.updateCosts);
  const resetParameters = useAnalyticsStore(state => state.resetParameters);
  
  const [hasChanges, setHasChanges] = useState(false);
  const [activePanel, setActivePanel] = useState<string[]>(['thresholds', 'costs']);

  // Debounced update functions
  const debouncedThresholdUpdate = useCallback(
    debounce((newThresholds: Partial<Thresholds>) => {
      perfTimer.start();
      updateThresholds(newThresholds);
      perfTimer.end('stateUpdate');
      logger.action('updateThresholds', newThresholds);
    }, 500),
    []
  );

  const debouncedCostUpdate = useCallback(
    debounce((newCosts: Partial<Costs>) => {
      perfTimer.start();
      updateCosts(newCosts);
      perfTimer.end('stateUpdate');
      logger.action('updateCosts', newCosts);
    }, 500),
    []
  );

  useEffect(() => {
    logger.mount({ thresholds, costs });
    return () => logger.unmount();
  }, []);

  useEffect(() => {
    const defaultsChanged = 
      JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_THRESHOLDS) ||
      JSON.stringify(costs) !== JSON.stringify(DEFAULT_COSTS);
    setHasChanges(defaultsChanged);
  }, [thresholds, costs]);

  const handleThresholdChange = (
    category: keyof Thresholds,
    field: string,
    value: number
  ) => {
    const oldValue = thresholds[category][field as keyof typeof thresholds[typeof category]];
    logger.action('thresholdChange', { category, field, oldValue, newValue: value });
    
    debouncedThresholdUpdate({
      [category]: {
        ...thresholds[category],
        [field]: value,
      },
    });
  };

  const handleCostChange = (category: keyof Costs, value: number) => {
    const oldValue = costs[category];
    logger.action('costChange', { category, oldValue, newValue: value });
    
    debouncedCostUpdate({
      [category]: value,
    });
  };

  const handleReset = () => {
    logger.action('resetParameters');
    resetParameters();
  };

  const handleSavePreset = () => {
    logger.action('savePreset', { thresholds, costs });
    // TODO: Implement preset saving
  };

  return (
    <Card 
      className={styles.controlsCard}
      title={
        <div className={styles.cardTitle}>
          <SettingOutlined /> Parameter Controls
          {hasChanges && (
            <Badge 
              status="processing" 
              text="Modified" 
              className={styles.modifiedBadge}
            />
          )}
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Save as preset">
            <Button 
              icon={<SaveOutlined />} 
              size="small"
              onClick={handleSavePreset}
            />
          </Tooltip>
          <Tooltip title="Reset to defaults">
            <Button 
              icon={<ReloadOutlined />} 
              size="small"
              onClick={handleReset}
              disabled={!hasChanges}
            />
          </Tooltip>
        </Space>
      }
    >
      <Collapse 
        activeKey={activePanel}
        onChange={setActivePanel}
        className={styles.collapse}
      >
        <Panel 
          header="Maintenance Thresholds" 
          key="thresholds"
          className={styles.panel}
        >
          {/* Road Reconstruction */}
          <div className={styles.categorySection}>
            <h4 className={styles.categoryTitle}>Road Reconstruction</h4>
            <SliderGroup
              label="IRI Threshold"
              value={thresholds.reconstruction.iri}
              min={8}
              max={20}
              step={0.5}
              unit=" mm/m"
              tooltip="International Roughness Index threshold for reconstruction"
              onChange={(val) => handleThresholdChange('reconstruction', 'iri', val)}
              marks={{ 8: '8', 12: '12', 16: '16', 20: '20' }}
            />
            <SliderGroup
              label="Rut Depth"
              value={thresholds.reconstruction.rut}
              min={20}
              max={60}
              step={1}
              unit=" mm"
              tooltip="Rutting depth threshold for reconstruction"
              onChange={(val) => handleThresholdChange('reconstruction', 'rut', val)}
              marks={{ 20: '20', 40: '40', 60: '60' }}
            />
            <SliderGroup
              label="PSCI Rating"
              value={thresholds.reconstruction.psci}
              min={1}
              max={4}
              step={1}
              unit=""
              tooltip="Pavement Surface Condition Index threshold"
              onChange={(val) => handleThresholdChange('reconstruction', 'psci', val)}
              marks={{ 1: '1', 2: '2', 3: '3', 4: '4' }}
            />
          </div>

          {/* Structural Overlay */}
          <div className={styles.categorySection}>
            <h4 className={styles.categoryTitle}>Structural Overlay</h4>
            <SliderGroup
              label="IRI Threshold"
              value={thresholds.overlay.iri}
              min={5}
              max={12}
              step={0.5}
              unit=" mm/m"
              onChange={(val) => handleThresholdChange('overlay', 'iri', val)}
              marks={{ 5: '5', 7: '7', 9: '9', 12: '12' }}
            />
            <SliderGroup
              label="Rut Depth"
              value={thresholds.overlay.rut}
              min={10}
              max={40}
              step={1}
              unit=" mm"
              onChange={(val) => handleThresholdChange('overlay', 'rut', val)}
              marks={{ 10: '10', 20: '20', 30: '30', 40: '40' }}
            />
            <SliderGroup
              label="PSCI Rating"
              value={thresholds.overlay.psci}
              min={2}
              max={6}
              step={1}
              unit=""
              onChange={(val) => handleThresholdChange('overlay', 'psci', val)}
              marks={{ 2: '2', 4: '4', 6: '6' }}
            />
          </div>

          {/* Surface Restoration */}
          <div className={styles.categorySection}>
            <h4 className={styles.categoryTitle}>Surface Restoration</h4>
            <SliderGroup
              label="PSCI Lower Bound"
              value={thresholds.restoration.psci_lower}
              min={3}
              max={7}
              step={1}
              unit=""
              onChange={(val) => handleThresholdChange('restoration', 'psci_lower', val)}
              marks={{ 3: '3', 5: '5', 7: '7' }}
            />
            <SliderGroup
              label="PSCI Upper Bound"
              value={thresholds.restoration.psci_upper}
              min={4}
              max={8}
              step={1}
              unit=""
              onChange={(val) => handleThresholdChange('restoration', 'psci_upper', val)}
              marks={{ 4: '4', 6: '6', 8: '8' }}
            />
            <SliderGroup
              label="IRI Threshold"
              value={thresholds.restoration.iri}
              min={4}
              max={8}
              step={0.5}
              unit=" mm/m"
              onChange={(val) => handleThresholdChange('restoration', 'iri', val)}
              marks={{ 4: '4', 6: '6', 8: '8' }}
            />
          </div>

          {/* Restoration of Skid Resistance */}
          <div className={styles.categorySection}>
            <h4 className={styles.categoryTitle}>Restoration of Skid Resistance</h4>
            <SliderGroup
              label="PSCI Lower Bound"
              value={thresholds.skid.psci_lower}
              min={5}
              max={9}
              step={1}
              unit=""
              onChange={(val) => handleThresholdChange('skid', 'psci_lower', val)}
              marks={{ 5: '5', 7: '7', 9: '9' }}
            />
            <SliderGroup
              label="PSCI Upper Bound"
              value={thresholds.skid.psci_upper}
              min={6}
              max={10}
              step={1}
              unit=""
              onChange={(val) => handleThresholdChange('skid', 'psci_upper', val)}
              marks={{ 6: '6', 8: '8', 10: '10' }}
            />
            <SliderGroup
              label="CSC Threshold"
              value={thresholds.skid.csc}
              min={0.2}
              max={0.5}
              step={0.05}
              unit=""
              tooltip="Characteristic SCRIM Coefficient threshold"
              onChange={(val) => handleThresholdChange('skid', 'csc', val)}
              marks={{ 0.2: '0.2', 0.35: '0.35', 0.5: '0.5' }}
            />
            <SliderGroup
              label="MPD Threshold"
              value={thresholds.skid.mpd}
              min={0.4}
              max={1.2}
              step={0.1}
              unit=" mm"
              tooltip="Mean Profile Depth threshold"
              onChange={(val) => handleThresholdChange('skid', 'mpd', val)}
              marks={{ 0.4: '0.4', 0.7: '0.7', 1.0: '1.0', 1.2: '1.2' }}
            />
          </div>
        </Panel>

        <Panel 
          header="Maintenance Costs (€/m²)" 
          key="costs"
          className={styles.panel}
        >
          <div className={styles.costsGrid}>
            {Object.entries(costs).map(([key, value]) => (
              <div key={key} className={styles.costItem}>
                <label className={styles.costLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                </label>
                <InputNumber
                  className={styles.costInput}
                  value={value}
                  min={0}
                  max={200}
                  step={5}
                  prefix="€"
                  onChange={(val) => val !== null && handleCostChange(key as keyof Costs, val)}
                />
              </div>
            ))}
          </div>
        </Panel>
      </Collapse>
    </Card>
  );
};