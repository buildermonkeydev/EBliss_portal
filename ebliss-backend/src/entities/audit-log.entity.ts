import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  admin_id: number;

  @Column()
  action: string;

  @Column({ nullable: true })
  target_type: string;

  @Column({ nullable: true })
  target_id: string;

  @Column({ type: 'json', nullable: true })
  payload_json: any;

  @Column()
  ip: string;

  @CreateDateColumn()
  created_at: Date;
}