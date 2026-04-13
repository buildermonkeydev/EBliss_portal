import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gateways')
export class Gateway {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  provider: string;

  @Column({ type: 'json' })
  config_json: any;

  @Column({ default: true })
  active: boolean;
}