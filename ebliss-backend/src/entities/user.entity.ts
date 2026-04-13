import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { VM } from './vm.entity';
import { Transaction } from './transaction.entity';
import { Invoice } from './invoice.entity';
import { SSHKey } from './ssh-key.entity';
import { Ticket } from './ticket.entity';
import { IPAddress } from './ip-address.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column({ default: 'customer' })
  role: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  wallet_balance: number;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => VM, vm => vm.user)
  vms: VM[];

  @OneToMany(() => Transaction, transaction => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Invoice, invoice => invoice.user)
  invoices: Invoice[];

  @OneToMany(() => SSHKey, sshKey => sshKey.user)
  ssh_keys: SSHKey[];

  @OneToMany(() => Ticket, ticket => ticket.user)
  tickets: Ticket[];

  @OneToMany(() => IPAddress, ip => ip.user)
  ip_addresses: IPAddress[];
}