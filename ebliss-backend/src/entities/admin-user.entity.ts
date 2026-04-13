import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column({ type: 'enum', enum: ['super', 'accountant', 'technical', 'readonly'] })
  role: string;

  @Column({ nullable: true })
  mfa_secret: string;

  @CreateDateColumn()
  created_at: Date;
}