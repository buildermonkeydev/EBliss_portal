import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pop } from './pop.entity';
import { User } from './user.entity';
import { VM } from './vm.entity';

@Entity('ip_addresses')
export class IPAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column()
  subnet: string;

  @Column()
  pop_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({ nullable: true })
  vm_id: number;

  @Column({ nullable: true })
  ptr_record: string;

  @Column({ default: 'available' })
  status: string;

  @ManyToOne(() => Pop, pop => pop.ip_addresses)
  @JoinColumn({ name: 'pop_id' })
  pop: Pop;

  @ManyToOne(() => User, user => user.ip_addresses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => VM)
  @JoinColumn({ name: 'vm_id' })
  vm: VM;
}