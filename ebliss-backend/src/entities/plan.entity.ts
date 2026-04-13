import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['hourly', 'monthly'] })
  type: string;

  @Column()
  vcpu: number;

  @Column()
  ram_gb: number;

  @Column()
  ssd_gb: number;

  @Column()
  bandwidth_gb: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}