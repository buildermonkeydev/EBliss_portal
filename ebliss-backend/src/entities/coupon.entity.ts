import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: ['percentage', 'fixed'] })
  discount_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column()
  max_uses: number;

  @Column({ default: 0 })
  used_count: number;

  @Column()
  expires_at: Date;
}